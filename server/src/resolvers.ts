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
interface SignUpArgs { input: { username: string; email: string; password: string } }
interface SignInArgs { input: { email: string; password: string } }
interface VerifyArgs { token: string }
interface SubmitSurveyArgs {
  input: {
    gender: string; ageGroup: string; sectorId: string; educationId: string;
    designation: string; country: string; state: string; city: string;
    consent: boolean; answers: { questionId: string; value: string }[];
  };
}

// ---- SWSWBS scoring constants (from the User Guide) ----
// Each item is scored 1..5 (1=none of the time … 5=all of the time).
const SCALE_TO_NUMBER: Record<string, number> = {
  NONE_OF_THE_TIME: 1,
  RARELY: 2,
  SOME_OF_THE_TIME: 3,
  OFTEN: 4,
  ALL_OF_THE_TIME: 5,
};
const TOTAL_ITEMS = 14;   // the scale has 14 items
const MIN_ANSWERS = 12;   // a respondent must answer at least 12, else excluded
const COOLDOWN_DAYS = 14;  // one submission per fortnight (matches the recall window)

// The three validated subscales and their names (User Guide, Fig. 2).
const FACTOR_NAMES: Record<number, string> = {
  1: 'Safe and inclusive interaction with others',
  2: 'Learning, helping, and feeling useful',
  3: 'Security, worthwhile activities, family and friends',
};

function formatSurveyUsername(n: number): string {
  return `SWSWBS${String(n).padStart(4, '0')}`;
}

// Load the logged-in user, or throw if there's no valid token.
async function requireUser(context: Context) {
  if (!context.userId) {
    throw new GraphQLError('You must be logged in.', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  const user = await prisma.user.findUnique({ where: { id: context.userId } });
  if (!user) {
    throw new GraphQLError('User not found.', { extensions: { code: 'UNAUTHENTICATED' } });
  }
  return user;
}

// When (if ever) this user is next allowed to submit — null means "never taken it".
async function getNextEligible(userId: string): Promise<Date | null> {
  const last = await prisma.surveyResponse.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!last) return null; // never submitted → eligible now
  return new Date(last.createdAt.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
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

    me: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.userId) return null;
      return prisma.user.findUnique({ where: { id: context.userId } });
    },

    // Responses scoped by the current user's role.
    surveyResponses: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await requireUser(context);
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

    // Can the current user submit now, and if not, when?
    surveyEligibility: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await requireUser(context);
      const nextEligible = await getNextEligible(user.id);
      const canSubmit = !nextEligible || nextEligible <= new Date();
      return {
        canSubmit,
        nextEligibleAt: canSubmit ? null : nextEligible!.toISOString(),
        cooldownDays: COOLDOWN_DAYS,
      };
    },
  },

  Mutation: {
    signUp: async (_parent: unknown, args: SignUpArgs) => {
      const { username, email, password } = args.input;
      const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
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
          userId: user.id, tokenHash: hash, type: 'EMAIL_VERIFICATION',
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
      if (!record || record.consumedAt || record.type !== 'EMAIL_VERIFICATION' || record.expiresAt < new Date()) {
        throw new GraphQLError('Invalid or expired verification link.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const [user] = await prisma.$transaction([
        prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
        prisma.verificationToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
      ]);
      return { token: signAccessToken(user.id), user };
    },

    signIn: async (_parent: unknown, args: SignInArgs) => {
      const { email, password } = args.input;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
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

    // Create a survey response and its answer rows, atomically.
    submitSurvey: async (_parent: unknown, args: SubmitSurveyArgs, context: Context) => {
      const user = await requireUser(context);
      const { input } = args;

      // Consent is required by the study.
      if (!input.consent) {
        throw new GraphQLError('Consent is required to submit the survey.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Missing-data rule: at least 12 of 14 items, no duplicates, no more than 14.
      const uniqueQuestions = new Set(input.answers.map((a) => a.questionId));
      if (uniqueQuestions.size !== input.answers.length) {
        throw new GraphQLError('Each question may be answered only once.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (input.answers.length < MIN_ANSWERS || input.answers.length > TOTAL_ITEMS) {
        throw new GraphQLError(
          `Please answer between ${MIN_ANSWERS} and ${TOTAL_ITEMS} questions.`,
          { extensions: { code: 'BAD_USER_INPUT' } },
        );
      }

      // 14-day cooldown: one submission per fortnight.
      const nextEligible = await getNextEligible(user.id);
      if (nextEligible && nextEligible > new Date()) {
        throw new GraphQLError(
          `You've completed the survey recently. You can take it again on ${nextEligible.toISOString()}.`,
          { extensions: { code: 'FORBIDDEN' } },
        );
      }

      // Turn each answer into a row, mapping the scale to its 1..5 value.
      const answerRows = input.answers.map((a) => ({
        questionId: a.questionId,
        value: a.value as never, // validated by the GraphQL enum
        numericValue: SCALE_TO_NUMBER[a.value] ?? 0,
      }));

      // Nested create = one automatic transaction (response + answers together).
      return prisma.surveyResponse.create({
        data: {
          userId: user.id,
          groupId: user.groupId,
          surveyUsername: user.surveyUsername,
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

  // Computed fields on SurveyResponse.
  SurveyResponse: {
    // Total score with the User Guide's missing-data rule: each missing item is
    // imputed with the mean of the answered ones, then all 14 are summed.
    // That reduces to sum * 14 / n; when all 14 are present it's just the sum.
    // Rounded to a whole number (the total is reported as an integer, range 14–70).
    totalScore: (parent: { answers?: { numericValue: number }[] }) => {
      const values = (parent.answers ?? []).map((a) => a.numericValue);
      const n = values.length;
      if (n === 0) return 0;
      const sum = values.reduce((s, v) => s + v, 0);
      return Math.round((sum * TOTAL_ITEMS) / n);
    },

    // A raw score per subscale = sum of that factor's answered items.
    subscaleScores: (parent: {
      answers?: { numericValue: number; question?: { factor: number | null } | null }[];
    }) => {
      const answers = parent.answers ?? [];
      return Object.entries(FACTOR_NAMES).map(([f, name]) => {
        const factor = Number(f);
        const score = answers
          .filter((a) => a.question?.factor === factor)
          .reduce((s, a) => s + a.numericValue, 0);
        return { factor, name, score };
      });
    },

    // The DB gives a Date; the schema field is String!, so convert to ISO text.
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },
};