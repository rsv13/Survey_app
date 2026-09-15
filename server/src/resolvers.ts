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

// Argument shapes (match the schema inputs).
interface SignUpArgs {
  input: { username: string; email: string; password: string };
}
interface SignInArgs {
  input: { email: string; password: string };
}
interface VerifyArgs {
  token: string;
}
interface SubmitSurveyArgs {
  input: {
    gender: string;
    ageGroup: string;
    sectorId: string;
    educationId: string;
    designation: string;
    country: string;
    state: string;
    city: string;
    consent: boolean;
    answers: { questionId: string; value: string }[];
  };
}

// Each answer scale maps to a 0..4 number, for scoring and averaging.
const SCALE_TO_NUMBER: Record<string, number> = {
  NONE_OF_THE_TIME: 0,
  RARELY: 1,
  SOME_OF_THE_TIME: 2,
  OFTEN: 3,
  ALL_OF_THE_TIME: 4,
};

// Build the "SWSWBS0001" handle from the numeric survey number.
function formatSurveyUsername(n: number): string {
  return `SWSWBS${String(n).padStart(4, '0')}`;
}

// Load the logged-in user, or throw if there's no valid token.
async function requireUser(context: Context) {
  if (!context.userId) {
    throw new GraphQLError('You must be logged in.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user) {
    throw new GraphQLError('User not found.', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return user;
}

// The relations to load whenever we return a full response.
const responseInclude = {
  answers: { include: { question: true } },
  sector: true,
  education: true,
} as const;

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

    // The currently logged-in user, or null.
    me: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.userId) return null;
      return prisma.user.findUnique({ where: { id: context.userId } });
    },

    // Responses the current user is allowed to see, scoped by their role.
    surveyResponses: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await requireUser(context);

      // Role decides the scope. Admin: everything. Group admin: their group.
      // Normal user: only their own. deletedAt:null hides soft-deleted rows.
      return prisma.surveyResponse.findMany({
        where: {
          deletedAt: null,
          ...(user.role === 'GROUP_ADMIN' ? { groupId: user.groupId } : {}),
          ...(user.role === 'NORMAL_USER' ? { userId: user.id } : {}),
        },
        include: responseInclude,
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    signUp: async (_parent: unknown, args: SignUpArgs) => {
      const { username, email, password } = args.input;

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });
      if (existing) {
        throw new GraphQLError('That email or username is already in use.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const passwordHash = await hashPassword(password);
      const created = await prisma.user.create({
        data: { username, email, passwordHash, surveyUsername: 'PENDING' },
      });
      const user = await prisma.user.update({
        where: { id: created.id },
        data: { surveyUsername: formatSurveyUsername(created.surveyNumber) },
      });

      const { raw, hash } = createVerificationToken();
      await prisma.verificationToken.create({
        data: {
          userId: user.id,
          tokenHash: hash,
          type: 'EMAIL_VERIFICATION',
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      });

      console.log(`\n[DEV] Verify ${email} with this token:\n  ${raw}\n`);
      return user;
    },

    verifyEmail: async (_parent: unknown, args: VerifyArgs) => {
      const record = await prisma.verificationToken.findUnique({
        where: { tokenHash: hashToken(args.token) },
      });
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
      return { token: signAccessToken(user.id), user };
    },

    signIn: async (_parent: unknown, args: SignInArgs) => {
      const { email, password } = args.input;
      const user = await prisma.user.findUnique({ where: { email } });
      if (
        !user ||
        !user.passwordHash ||
        !(await verifyPassword(password, user.passwordHash))
      ) {
        throw new GraphQLError('Invalid email or password.', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      if (!user.emailVerified) {
        throw new GraphQLError('Please verify your email before logging in.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
      return { token: signAccessToken(user.id), user };
    },

    // Create a survey response and all its answer rows, atomically.
    submitSurvey: async (_parent: unknown, args: SubmitSurveyArgs, context: Context) => {
      const user = await requireUser(context);
      const { input } = args;

      // The study requires consent.
      if (!input.consent) {
        throw new GraphQLError('Consent is required to submit the survey.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Turn each incoming answer into a row, adding its 0..4 numeric value.
      const answerRows = input.answers.map((a) => ({
        questionId: a.questionId,
        value: a.value as never, // already validated by the GraphQL enum
        numericValue: SCALE_TO_NUMBER[a.value] ?? 0,
      }));

      // A Prisma NESTED create runs inside a transaction automatically — the
      // response and all its answers save together, or nothing does.
      return prisma.surveyResponse.create({
        data: {
          userId: user.id,
          groupId: user.groupId,
          surveyUsername: user.surveyUsername, // pseudonym snapshot
          gender: input.gender as never,
          ageGroup: input.ageGroup as never,
          sectorId: input.sectorId,
          educationId: input.educationId,
          designation: input.designation,
          country: input.country,
          state: input.state,
          city: input.city,
          consent: input.consent,
          answers: { create: answerRows },
        },
        include: responseInclude,
      });
    },
  },

  // Field resolvers for computed values on SurveyResponse.
  SurveyResponse: {
    // totalScore isn't stored — we sum the answers' numeric values on the fly.
    totalScore: (parent: { answers?: { numericValue: number }[] }) =>
      (parent.answers ?? []).reduce((sum, a) => sum + a.numericValue, 0),
    // The DB gives a Date; the schema field is String!, so convert to ISO text.
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },
};