// Input validation for auth (email format + password strength).
// Kept simple and dependency-free for now; a fuller Zod-based validation
// across all mutations is planned (see the pre-launch checklist).

import { GraphQLError } from 'graphql';

// Small helper so every validation failure looks the same to the client.
function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

// Clean and validate an email, returning a normalised value (trimmed +
// lower-cased) so we store and match emails consistently. We keep the format
// check pragmatic rather than RFC-perfect — the verification email is the real
// proof the address works.
export function normaliseEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badInput('Please enter a valid email address.');
  }
  return email;
}

// Password policy. We follow modern guidance (length first, all characters
// allowed) rather than rigid "must have a capital/symbol" rules, plus a light
// letter+number check. bcrypt only uses the first 72 BYTES of a password, so we
// cap the byte length to avoid silently ignoring the rest.
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;
export function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN) {
    badInput(`Password must be at least ${PASSWORD_MIN} characters.`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    badInput(`Password is too long (max ${PASSWORD_MAX_BYTES} bytes).`);
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    badInput('Password must include at least one letter and one number.');
  }
  // Every character is allowed — no restriction on symbols or spaces.
}
