import { promises as fs } from "fs";
import path from "path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "crypto";
import type { PublicUser, Role, User } from "./types";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), ".data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SECRET_FILE = path.join(DATA_DIR, "auth-secret");

export const SESSION_COOKIE = "qbi_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

let chain: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

// --- password hashing --------------------------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

// --- signed session cookie ----------------------------------------------
// Dependency-free stand-in for a JWT: base64url(payload) + "." +
// HMAC-SHA256(payload), verified with a constant-time comparison. The
// signing secret is read from AUTH_SECRET if set, otherwise generated once
// and cached in .data/auth-secret so sessions survive restarts without any
// configuration.

let cachedSecret: string | null = null;
async function getSecret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (cachedSecret) return cachedSecret;
  try {
    cachedSecret = (await fs.readFile(SECRET_FILE, "utf8")).trim();
    if (cachedSecret) return cachedSecret;
  } catch {
    // fall through to generate one
  }
  cachedSecret = randomBytes(32).toString("hex");
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SECRET_FILE, cachedSecret, "utf8");
  return cachedSecret;
}

export type SessionPayload = { sub: string; role: Role; exp: number };

export async function signSession(payload: SessionPayload): Promise<string> {
  const secret = await getSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const secret = await getSecret();
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newSessionPayload(userId: string, role: Role): SessionPayload {
  return { sub: userId, role, exp: Date.now() + SESSION_TTL_MS };
}

// --- user storage ---------------------------------------------------------

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    clubIds: user.clubIds,
    createdAt: user.createdAt,
  };
}

export function listUsers(): Promise<User[]> {
  return withLock(() => readJson<User[]>(USERS_FILE, []));
}

export function findUserById(id: string): Promise<User | undefined> {
  return withLock(async () => (await readJson<User[]>(USERS_FILE, [])).find((u) => u.id === id));
}

export function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  return withLock(async () =>
    (await readJson<User[]>(USERS_FILE, [])).find((u) => u.email === normalized),
  );
}

export function createUser(
  email: string,
  password: string,
  role: Role,
  clubIds: string[],
): Promise<User> {
  return withLock(async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@"))
      throw new Error("Enter a valid email address.");
    if (password.length < 8) throw new Error("Password needs to be at least 8 characters.");
    if (role === "club_admin" && clubIds.length === 0)
      throw new Error("A club admin needs at least one club.");

    const users = await readJson<User[]>(USERS_FILE, []);
    if (users.some((u) => u.email === normalized))
      throw new Error("That email is already in use.");

    const user: User = {
      id: randomUUID(),
      email: normalized,
      passwordHash: hashPassword(password),
      role,
      clubIds: role === "super_admin" ? [] : clubIds,
      createdAt: Date.now(),
    };
    users.push(user);
    await writeJson(USERS_FILE, users);
    return user;
  });
}

export function deleteUser(id: string): Promise<void> {
  return withLock(async () => {
    const users = await readJson<User[]>(USERS_FILE, []);
    const next = users.filter((u) => u.id !== id);
    if (next.length === users.length) throw new Error("That user no longer exists.");
    if (!next.some((u) => u.role === "super_admin"))
      throw new Error("Can't delete the last super admin.");
    await writeJson(USERS_FILE, next);
  });
}

export function verifyLogin(email: string, password: string): Promise<User | null> {
  return withLock(async () => {
    const normalized = email.trim().toLowerCase();
    const user = (await readJson<User[]>(USERS_FILE, [])).find((u) => u.email === normalized);
    if (!user || !verifyPassword(password, user.passwordHash)) return null;
    return user;
  });
}

// --- authorization helpers -------------------------------------------------

export function canAccessClub(user: Pick<User, "role" | "clubIds">, clubId: string): boolean {
  return user.role === "super_admin" || user.clubIds.includes(clubId);
}
