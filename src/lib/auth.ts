import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "crypto";
import type { PublicUser, Role, User } from "./types";
import { createTextIfAbsent, readDoc, updateDoc } from "./storage";

// Document keys; see ./storage for where they live (DATA_DIR or S3).
const USERS_KEY = "users.json";
const SECRET_KEY = "auth-secret";

export const SESSION_COOKIE = "qbi_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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
// and stored as the `auth-secret` document so sessions survive restarts
// without any configuration. It's created only-if-absent, so instances
// racing on first boot all settle on the same secret.

let cachedSecret: string | null = null;
async function getSecret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  cachedSecret ??= await createTextIfAbsent(SECRET_KEY, randomBytes(32).toString("hex"));
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
  return readDoc<User[]>(USERS_KEY, []);
}

export async function findUserById(id: string): Promise<User | undefined> {
  return (await listUsers()).find((u) => u.id === id);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalized = email.trim().toLowerCase();
  return (await listUsers()).find((u) => u.email === normalized);
}

export async function createUser(
  email: string,
  password: string,
  role: Role,
  clubIds: string[],
): Promise<User> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@"))
    throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Password needs to be at least 8 characters.");
  if (role === "club_admin" && clubIds.length === 0)
    throw new Error("A club admin needs at least one club.");

  // Built (and hashed) once, outside the update, since updateDoc may re-run
  // its callback on a write conflict.
  const user: User = {
    id: randomUUID(),
    email: normalized,
    passwordHash: hashPassword(password),
    role,
    clubIds: role === "super_admin" ? [] : clubIds,
    createdAt: Date.now(),
  };
  return updateDoc<User[], User>(USERS_KEY, [], (users) => {
    if (users.some((u) => u.email === normalized))
      throw new Error("That email is already in use.");
    users.push(user);
    return user;
  });
}

export type UserUpdate = {
  email?: string;
  password?: string;
  role?: Role;
  clubIds?: string[];
};

export function updateUser(id: string, update: UserUpdate): Promise<User> {
  if (update.password !== undefined && update.password !== "" && update.password.length < 8)
    return Promise.reject(new Error("Password needs to be at least 8 characters."));
  // Hashed once, outside the update, since updateDoc may re-run its
  // callback on a write conflict.
  const passwordHash = update.password ? hashPassword(update.password) : null;

  return updateDoc<User[], User>(USERS_KEY, [], (users) => {
    const user = users.find((u) => u.id === id);
    if (!user) throw new Error("That user no longer exists.");

    if (update.email !== undefined) {
      const normalized = update.email.trim().toLowerCase();
      if (!normalized || !normalized.includes("@"))
        throw new Error("Enter a valid email address.");
      if (users.some((u) => u.id !== id && u.email === normalized))
        throw new Error("That email is already in use.");
      user.email = normalized;
    }

    if (passwordHash) user.passwordHash = passwordHash;

    const nextRole = update.role ?? user.role;
    const nextClubIds =
      nextRole === "super_admin" ? [] : (update.clubIds ?? user.clubIds);

    if (nextRole === "club_admin" && nextClubIds.length === 0)
      throw new Error("A club admin needs at least one club.");

    // Guard against demoting/removing the last super admin, mirroring
    // deleteUser's guard — the app must always have at least one.
    if (user.role === "super_admin" && nextRole !== "super_admin") {
      const remaining = users.filter(
        (u) => u.role === "super_admin" && u.id !== id,
      );
      if (remaining.length === 0) throw new Error("Can't demote the last super admin.");
    }

    user.role = nextRole;
    user.clubIds = nextClubIds;
    return user;
  });
}

export function deleteUser(id: string): Promise<void> {
  return updateDoc<User[], void>(USERS_KEY, [], (users) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) throw new Error("That user no longer exists.");
    if (!users.some((u) => u.role === "super_admin" && u.id !== id))
      throw new Error("Can't delete the last super admin.");
    users.splice(index, 1);
  });
}

export async function verifyLogin(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user;
}

// Authorization helpers (canAccessClub, canManageClub) live in
// ./permissions — pure, client-safe, no fs/crypto — so components can import
// them directly instead of this server-only module.
export { canAccessClub, canManageClub } from "./permissions";
