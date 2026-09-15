// Auth helpers: password hashing, login tokens (JWT), and verification tokens.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set — check server/.env');
}

// --- Passwords ---

// Turn a plain password into a one-way hash before storing it (cost 12).
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

// Check a login attempt against the stored hash (returns true/false).
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// --- Login tokens (JWT) ---

// Create a signed token that proves who the user is. Expires in 7 days.
// `sub` (subject) is the standard JWT field for "who this token is about".
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET!, { expiresIn: '7d' });
}

// Verify a token and return the user id, or null if it's invalid/expired.
export function verifyAccessToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

// --- Verification / password-reset tokens ---

// Make a random token. We put the RAW value in the link we send the user,
// but store only its HASH in the database — so even a database leak can't be
// used to verify or reset an account.
export function createVerificationToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}

// Hash a token the same way every time, so we can find the stored hash
// from the raw token the user sends back.
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}