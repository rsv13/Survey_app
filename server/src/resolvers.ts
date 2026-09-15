// src/resolvers.ts
// Resolvers: the functions that fetch/change data for each field in the schema.

import { GraphQLError } from 'graphql';
import { prisma } from './lib/prisma.js';
import type { Context } from './context.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  createVerificationToken,
  hashToken,
} from './lib/auth.js';

// The shapes of the arguments coming in from GraphQL (match the schema inputs).
interface SignUpArgs {
  input: { username: string; email: string; password: string };
}
interface SignInArgs {
  input: { email: string; password: string };
}
interface VerifyArgs {
  token: string;
}

// Build the "SWSWBS0001" handle from the numeric survey number.
function formatSurveyUsername(n: number): string {
  return `SWSWBS${String(n).padStart(4, '0')}`;
}

export const resolvers = {
  Query: {
    surveyDefinition: async () => {
      const questions = await prisma.surveyQuestion.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
      });
      const sectors = await prisma.surveyOption.findMany({
        where: { category: 'SECTOR', active: true },
        orderBy: { order: 'asc' },
      });
      const educationLevels = await prisma.surveyOption.findMany({
        where: { category: 'EDUCATION', active: true },
        orderBy: { order: 'asc' },
      });
      return { questions, sectors, educationLevels };
    },

    // Returns the currently logged-in user, or null if nobody is logged in.
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.userId) return null;
      return prisma.user.findUnique({ where: { id: context.userId } });
    },
  },

  Mutation: {
    // Create a new (unverified) account and issue an email-verification token.
    signUp: async (_parent: unknown, args: SignUpArgs) => {
      const { username, email, password } = args.input;

      // Don't allow a duplicate email or username.
      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existing) {
        throw new GraphQLError('That email or username is already in use.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Store only the password HASH, never the password itself.
      const passwordHash = await hashPassword(password);

      // Create the user, then set the SWSWBS handle from the assigned number.
      const created = await prisma.user.create({
        data: { username, email, passwordHash, surveyUsername: 'PENDING' },
      });
      const user = await prisma.user.update({
        where: { id: created.id },
        data: { surveyUsername: formatSurveyUsername(created.surveyNumber) },
      });

      // Verification token: the raw value goes in the link, only the hash is stored.
      const { raw, hash } = createVerificationToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // valid 24h
        },
      });

      // DEV ONLY: log the token instead of sending a real email.
      console.log(`\n[DEV] Verify ${email} with this token:\n  ${raw}\n`);

      return user;
    },

    // Verify the email with the token, mark the user verified, and log them in.
    verifyEmail: async (_parent: unknown, args: VerifyArgs) => {
      const record = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashToken(args.token) },
      });

      // Reject unknown, already-used, expired, or wrong-type tokens.
      if (
        !record ||
        record.consumedAt ||
        record.type !== 'EMAIL_VERIFICATION' ||
        record.expiresAt < new Date()
      ) {
        throw new GraphQLError('Invalid or expired verification link.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Mark the user verified AND consume the token together (all-or-nothing).
      const [user] = await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { emailVerified: true },
        }),
        prisma.verificationToken.update({
          where: { id: record.id },
          data: { consumedAt: new Date() },
        }),
      ]);

      // Hand back a login token so verifying also logs them in.
      return { token: signAccessToken(user.id), user };
    },

    // Log in on return visits (email + password).
    signIn: async (_parent: unknown, args: SignInArgs) => {
      const { email, password } = args.input;
      const user = await prisma.user.findUnique({ where: { email } });

      // One generic message whether the email OR password is wrong, so we
      // don't reveal which emails have accounts.
      if (
        !user ||
        !user.passwordHash ||
        !(await verifyPassword(password, user.passwordHash))
      ) {
        throw new GraphQLError('Invalid email or password.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Block login until the email is verified.
      if (!user.emailVerified) {
        throw new GraphQLError('Please verify your email before logging in.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return { token: signAccessToken(user.id), user };
    },
  },
};
