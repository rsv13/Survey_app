// Builds the per-request context: reads the Bearer token from the request's
// Authorization header, verifies it, and exposes the logged-in user's id.

import type { IncomingMessage } from 'node:http';
import { verifyAccessToken } from './lib/auth.js';

// What every resolver receives as its `context` argument.
export interface Context {
  userId: string | null; // the logged-in user's id, or null if not logged in
}

export async function buildContext({ req }: { req: IncomingMessage }): Promise<Context> {
  // Clients send "Authorization: Bearer <token>". Pull the token out.
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Verify it; if valid, we get the user id back, otherwise null.
  const userId = token ? verifyAccessToken(token) : null;

  return { userId };
}