import { promises as fs } from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";

/**
 * JSON document storage shared by the club/session store and auth.
 *
 * Two backends behind one interface, chosen by environment:
 * - STORAGE_BUCKET set → S3 (for Amplify Hosting or any serverless host,
 *   where the local filesystem is ephemeral and instances don't share
 *   memory). Credentials come from the default AWS provider chain — on
 *   Amplify, the app's compute role.
 * - otherwise → files under DATA_DIR (default `.data/`), as before.
 *
 * Both expose the same keys (`clubs.json`, `users.json`,
 * `club-sessions/<clubId>.json`, ...), so moving data between them is a
 * straight copy (`aws s3 sync .data s3://<bucket>/<prefix>`).
 *
 * Writes go through `updateDoc`, an optimistic read-modify-write: each
 * document carries a version (S3 ETag, or a content hash on disk) and a
 * write only lands if the document hasn't changed since it was read;
 * otherwise it re-reads and re-applies the change. That keeps concurrent
 * requests from clobbering each other even across separate server
 * instances, which an in-process lock can't do.
 */

type Stored = { body: string; version: string };
type Condition = { ifVersion: string } | { ifAbsent: true };

interface Backend {
  get(key: string): Promise<Stored | null>;
  /** Writes `body` if `cond` still holds; resolves false on a conflict. */
  put(key: string, body: string, cond: Condition): Promise<boolean>;
  remove(key: string): Promise<void>;
}

// --- file backend ----------------------------------------------------------

// Override with DATA_DIR in .env.local to store data somewhere else (a
// mounted volume in a container, a separate dir per facility, etc).
// Relative paths resolve against the project root; absolute paths are used
// as-is.
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");

const hash = (body: string) => createHash("sha256").update(body).digest("hex");

/** Serializes each conditional check-then-write so it's atomic within this
 * process — the file backend is single-instance by nature. */
let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

function fileBackend(): Backend {
  const file = (key: string) => path.join(DATA_DIR, key);
  const get = async (key: string): Promise<Stored | null> => {
    try {
      const body = await fs.readFile(file(key), "utf8");
      return { body, version: hash(body) };
    } catch {
      return null;
    }
  };
  return {
    get,
    put: (key, body, cond) =>
      withLock(async () => {
        const current = await get(key);
        const ok = "ifAbsent" in cond ? !current : current?.version === cond.ifVersion;
        if (!ok) return false;
        // Write-then-rename so a concurrent (unlocked) read sees either the
        // old file or the new one, never a half-written one.
        const target = file(key);
        const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`;
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(tmp, body, "utf8");
        await fs.rename(tmp, target);
        return true;
      }),
    remove: (key) => withLock(() => fs.rm(file(key), { force: true })),
  };
}

// --- S3 backend ------------------------------------------------------------

function s3Backend(bucket: string): Backend {
  const client = new S3Client({ region: process.env.STORAGE_REGION || undefined });
  const prefix = (process.env.STORAGE_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
  const objectKey = (key: string) => (prefix ? `${prefix}/${key}` : key);
  const status = (err: unknown) =>
    err instanceof S3ServiceException ? err.$metadata.httpStatusCode : undefined;

  return {
    async get(key) {
      try {
        const res = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key: objectKey(key) }),
        );
        const body = (await res.Body?.transformToString("utf8")) ?? "";
        return { body, version: res.ETag ?? hash(body) };
      } catch (err) {
        if (status(err) === 404) return null;
        throw err;
      }
    },
    async put(key, body, cond) {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey(key),
            Body: body,
            ContentType: "application/json",
            ...("ifAbsent" in cond ? { IfNoneMatch: "*" } : { IfMatch: cond.ifVersion }),
          }),
        );
        return true;
      } catch (err) {
        // 412: the condition failed. 409: a concurrent conditional write to
        // the same key is in flight. Either way, re-read and retry.
        const code = status(err);
        if (code === 412 || code === 409) return false;
        throw err;
      }
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey(key) }));
    },
  };
}

// --- public API ------------------------------------------------------------

let backend: Backend | null = null;
function store(): Backend {
  backend ??= process.env.STORAGE_BUCKET
    ? s3Backend(process.env.STORAGE_BUCKET)
    : fileBackend();
  return backend;
}

function parse<T>(stored: Stored | null, fallback: T): T {
  if (!stored) return fallback;
  try {
    return JSON.parse(stored.body) as T;
  } catch {
    return fallback;
  }
}

/** Reads a JSON document, or `fallback` if it doesn't exist (or is corrupt). */
export async function readDoc<T>(key: string, fallback: T): Promise<T> {
  return parse(await store().get(key), fallback);
}

const MAX_ATTEMPTS = 10;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Read-modify-write of one document. `fn` gets the current value (or
 * `fallback`), mutates it in place, and returns the caller's result; the
 * mutated value is then saved. If another writer got there first, `fn` is
 * re-run against the fresh value — so it must not have side effects outside
 * the document beyond what's safe to repeat. Throwing from `fn` aborts
 * without writing.
 */
export async function updateDoc<T, R>(
  key: string,
  fallback: T,
  fn: (value: T) => R | Promise<R>,
): Promise<R> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const stored = await store().get(key);
    // structuredClone so a retry never sees a previous attempt's mutations
    // of a shared fallback object.
    const value = stored ? parse(stored, structuredClone(fallback)) : structuredClone(fallback);
    const result = await fn(value);
    const cond: Condition = stored ? { ifVersion: stored.version } : { ifAbsent: true };
    if (await store().put(key, JSON.stringify(value, null, 2), cond)) return result;
    await pause(20 * 2 ** attempt * Math.random());
  }
  throw new Error("The data is busy right now — try again in a moment.");
}

/** Writes `body` only if `key` doesn't exist yet, then returns whichever
 * body ended up stored (ours, or the one that won the race). */
async function createIfAbsent(key: string, body: string): Promise<Stored> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const existing = await store().get(key);
    if (existing) return existing;
    if (await store().put(key, body, { ifAbsent: true })) return { body, version: hash(body) };
  }
  throw new Error("The data is busy right now — try again in a moment.");
}

/** JSON flavor of createIfAbsent: returns the stored value. */
export async function createDocIfAbsent<T>(key: string, value: T): Promise<T> {
  return parse(await createIfAbsent(key, JSON.stringify(value, null, 2)), value);
}

/** Plain-text flavor of createIfAbsent (e.g. the auth secret), trimmed. */
export async function createTextIfAbsent(key: string, text: string): Promise<string> {
  return (await createIfAbsent(key, text)).body.trim();
}

export async function removeDoc(key: string): Promise<void> {
  await store().remove(key);
}
