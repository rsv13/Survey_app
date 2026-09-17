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
import { normaliseEmail, validatePassword } from './lib/validation.js';
import crypto from 'node:crypto';

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

// A short, human-friendly invite code. We drop easily-confused characters
// (no O/0, no I/1) so codes are easy to read out and type without mistakes.
const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateInviteCode(length = 8): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_ALPHABET[crypto.randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

// Keep generating until we get one no group is using (invite codes are unique).
async function uniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const clash = await prisma.group.findUnique({ where: { inviteCode: code } });
    if (!clash) return code;
  }
  throw new GraphQLError('Could not generate a unique invite code — please try again.', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  });
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

// Load the logged-in user AND ensure they're the site admin, else throw.
// Reused by every ADMIN-only mutation.
async function requireAdmin(context: Context) {
  const user = await requireUser(context);
  if (user.role !== 'ADMIN') {
    throw new GraphQLError('Only a site admin can do that.', {
      extensions: { code: 'FORBIDDEN' },
    });
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

// Mean, sample SD, and an approximate 95% CI for a list of total scores.
function computeStats(values: number[]) {
  const n = values.length;
  if (n === 0) return { mean: 0, sd: 0, ci95Lower: 0, ci95Upper: 0, min: 0, max: 0 };
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  // Sample variance divides by n-1 (needs at least 2 values to have spread).
  const variance = n > 1 ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const margin = 1.96 * (sd / Math.sqrt(n)); // 1.96 = the 95% multiplier
  return {
    mean: round2(mean),
    sd: round2(sd),
    ci95Lower: round2(mean - margin),
    ci95Upper: round2(mean + margin),
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

// Bucket total scores into 8 bins across the 14–70 range for the histogram.
function buildDistribution(values: number[]) {
  const START = 14, BIN = 7, BINS = 8; // 14–20, 21–27, … , 63–70
  const bins = Array.from({ length: BINS }, (_, i) => {
    const from = START + i * BIN;
    const to = i === BINS - 1 ? 70 : from + BIN - 1;
    return { label: `${from}\u2013${to}`, from, to, count: 0 };
  });
  for (const v of values) {
    let idx = Math.floor((v - START) / BIN);
    idx = Math.max(0, Math.min(BINS - 1, idx)); // clamp into range
    bins[idx]!.count++;
  }
  return bins;
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
        // Aggregated stats for the group/admin dashboard. GROUP_ADMIN or ADMIN only.
    groupAnalytics: async (
      _parent: unknown,
      args: { groupId?: string | null },
      context: Context,
    ) => {
      const user = await requireUser(context);
      if (user.role !== 'ADMIN' && user.role !== 'GROUP_ADMIN') {
        throw new GraphQLError('Only a group admin or site admin can view analytics.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // Build a role-scoped filter, honouring an optional groupId.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { deletedAt: null };
      if (user.role === 'GROUP_ADMIN') {
        // A group admin may only see groups they actually administer.
        const adminGroups = await prisma.group.findMany({
          where: { admins: { some: { id: user.id } }, deletedAt: null },
          select: { id: true },
        });
        const ids = adminGroups.map((g) => g.id);
        if (args.groupId) {
          if (!ids.includes(args.groupId)) {
            throw new GraphQLError('You do not administer that group.', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          where.groupId = args.groupId;
        } else {
          // "__none__" guarantees an empty result if they admin no groups yet.
          where.groupId = { in: ids.length ? ids : ['__none__'] };
        }
      } else if (args.groupId) {
        where.groupId = args.groupId; // ADMIN focusing on one group
      }

      // Fetch the scoped responses with each answer's value + question info.
      const responses = await prisma.surveyResponse.findMany({
        where,
        select: {
          userId: true,
          answers: {
            select: {
              numericValue: true,
              question: { select: { order: true, text: true, factor: true } },
            },
          },
        },
      });

      // Per-response total, using the SAME imputation rule as the field resolver.
      const totals: number[] = [];
      const factorAgg: Record<number, { sum: number; n: number }> = {
        1: { sum: 0, n: 0 }, 2: { sum: 0, n: 0 }, 3: { sum: 0, n: 0 },
      };
      const itemAgg = new Map<number, { order: number; text: string; factor: number | null; sum: number; n: number }>();

      for (const r of responses) {
        const vals = r.answers.map((a) => a.numericValue);
        const n = vals.length;
        if (n > 0) {
          const sum = vals.reduce((s, v) => s + v, 0);
          totals.push(Math.round((sum * TOTAL_ITEMS) / n));
        }
        for (const a of r.answers) {
          const q = a.question;
          if (q.factor && factorAgg[q.factor]) {
            factorAgg[q.factor]!.sum += a.numericValue;
            factorAgg[q.factor]!.n += 1;
          }
          const it = itemAgg.get(q.order) ?? { order: q.order, text: q.text, factor: q.factor, sum: 0, n: 0 };
          it.sum += a.numericValue;
          it.n += 1;
          itemAgg.set(q.order, it);
        }
      }

      const participantCount = new Set(
        responses.map((r) => r.userId).filter((id): id is string => !!id),
      ).size;

      const subscales = [1, 2, 3].map((f) => ({
        factor: f,
        name: FACTOR_NAMES[f]!,
        mean: factorAgg[f]!.n ? Math.round((factorAgg[f]!.sum / factorAgg[f]!.n) * 100) / 100 : 0,
      }));

      const items = [...itemAgg.values()]
        .sort((a, b) => a.order - b.order)
        .map((it) => ({
          order: it.order, text: it.text, factor: it.factor,
          mean: it.n ? Math.round((it.sum / it.n) * 100) / 100 : 0,
          n: it.n,
        }));

      return {
        responseCount: responses.length,
        participantCount,
        totalScore: computeStats(totals),
        distribution: buildDistribution(totals),
        subscales,
        items,
      };
    },
  },

  Mutation: {
    signUp: async (_parent: unknown, args: SignUpArgs) => {
      const { username, password } = args.input;
      const email = normaliseEmail(args.input.email); // trims + lower-cases + checks format
      validatePassword(password);
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
      const { password } = args.input;
      const email = args.input.email.trim().toLowerCase();
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
    // --- Groups ---

    // Site admin promotes a normal user to Group Admin. This is the ONE
    // privileged trust grant — no other mutation hands out this role.
    grantGroupAdmin: async (
      _parent: unknown,
      args: { email: string },
      context: Context,
    ) => {
      await requireAdmin(context); // only a site admin may reach past this line

      const target = await prisma.user.findUnique({ where: { email: args.email } });
      if (!target) {
        throw new GraphQLError('No user found with that email.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (target.role === 'ADMIN') {
        // Don't quietly downgrade a fellow site admin.
        throw new GraphQLError('That user is already a site admin.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (target.role === 'GROUP_ADMIN') {
        return target; // already a group admin — nothing to do (safe to call twice)
      }

      return prisma.user.update({
        where: { id: target.id },
        data: { role: 'GROUP_ADMIN' },
      });
    },
    // Create a group. Allowed for a site admin OR a group admin (who can run
    // several cohorts). The caller becomes the group's creator and first admin.
    createGroup: async (
      _parent: unknown,
      args: { input: { name: string; description: string } },
      context: Context,
    ) => {
      const user = await requireUser(context);
      if (user.role !== 'ADMIN' && user.role !== 'GROUP_ADMIN') {
        throw new GraphQLError('Only a group admin or site admin can create a group.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const name = args.input.name.trim();
      const description = args.input.description.trim();
      if (!name || !description) {
        throw new GraphQLError('A group needs both a name and a description.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const taken = await prisma.group.findUnique({ where: { name } });
      if (taken) {
        throw new GraphQLError('A group with that name already exists.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const inviteCode = await uniqueInviteCode();

      // Nested write: create the group AND link the creator + first admin in
      // one atomic step. `connect` attaches existing User rows to the relations.
      return prisma.group.create({
        data: {
          name,
          description,
          inviteCode,
          creator: { connect: { id: user.id } },
          admins: { connect: { id: user.id } },
        },
      });
    },

    // Any signed-in user joins a group using its invite code.
    joinGroup: async (
      _parent: unknown,
      args: { inviteCode: string },
      context: Context,
    ) => {
      const user = await requireUser(context);

      // Must leave a current group before joining another. This keeps
      // membership unambiguous and is how a wrong-code join gets corrected:
      // leave, then join with the right code.
      if (user.groupId) {
        throw new GraphQLError('You are already in a group. Leave it before joining another.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Normalise the typed code so stray spaces / lower-case still match.
      const code = args.inviteCode.trim().toUpperCase();
      const group = await prisma.group.findUnique({ where: { inviteCode: code } });
      if (!group || group.deletedAt) {
        throw new GraphQLError('That invite code is not valid.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { groupId: group.id },
      });
      return group; // memberCount will now read one higher
    },

    // A member leaves their own group (membership back to none).
    leaveGroup: async (_parent: unknown, _args: unknown, context: Context) => {
      const user = await requireUser(context);
      if (!user.groupId) {
        throw new GraphQLError('You are not currently in a group.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      return prisma.user.update({
        where: { id: user.id },
        data: { groupId: null },
      });
    },

        // A group's own admin adds a co-admin. Two guards: the caller must admin
    // this group (or be the site admin), and the person being added must ALREADY
    // be a group admin — this shares a group, it never hands out the role.
    addGroupAdmin: async (
      _parent: unknown,
      args: { input: { email: string; groupId: string } },
      context: Context,
    ) => {
      const caller = await requireUser(context);
      const { email, groupId } = args.input;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { admins: { select: { id: true } } },
      });
      if (!group || group.deletedAt) {
        throw new GraphQLError('Group not found.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });

        
      }

      // Caller must be the site admin OR already an admin of THIS group.
      const callerAdminsThisGroup = group.admins.some((a) => a.id === caller.id);
      if (caller.role !== 'ADMIN' && !callerAdminsThisGroup) {
        throw new GraphQLError('Only an admin of this group can add a co-admin.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      const target = await prisma.user.findUnique({ where: { email } });
      if (!target) {
        throw new GraphQLError('No user found with that email.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // The person must already hold the group-admin role (granted by the site
      // admin). This is the guard that stops co-admin adds becoming a backdoor.
      if (target.role !== 'GROUP_ADMIN') {
        throw new GraphQLError(
          'That user must be granted group-admin access by the site admin first.',
          { extensions: { code: 'BAD_USER_INPUT' } },
        );
      }

      // Already a co-admin here? Nothing to do (safe to call twice).
      if (group.admins.some((a) => a.id === target.id)) {
        return group;
      }

      return prisma.group.update({
        where: { id: groupId },
        data: { admins: { connect: { id: target.id } } },
      });
    },

    // A group's admin removes a member from THEIR group (clears the member's
    // groupId). Group admins can remove ordinary members of their own group;
    // removing another admin is reserved for the site admin.
    removeMember: async (
      _parent: unknown,
      args: { userId: string },
      context: Context,
    ) => {
      const caller = await requireUser(context);

      const target = await prisma.user.findUnique({ where: { id: args.userId } });
      if (!target) {
        throw new GraphQLError('No user found with that id.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      if (!target.groupId) {
        throw new GraphQLError('That user is not in any group.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      
      

      const group = await prisma.group.findUnique({
        where: { id: target.groupId },
        include: { admins: { select: { id: true } } },
      });
      if (!group) {
        throw new GraphQLError('Group not found.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      // Caller must be the site admin OR an admin of this group.
      const callerAdminsGroup = group.admins.some((a) => a.id === caller.id);
      if (caller.role !== 'ADMIN' && !callerAdminsGroup) {
        throw new GraphQLError('Only an admin of this group can remove a member.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      // A co-admin can't remove a fellow admin — only the site admin can.
      const targetIsAdmin = group.admins.some((a) => a.id === target.id);
      if (targetIsAdmin && caller.role !== 'ADMIN') {
        throw new GraphQLError('Only the site admin can remove another admin.', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      return prisma.user.update({
        where: { id: target.id },
        data: { groupId: null },
      });
    },

      // Site admin moves a user into a group (e.g. correcting a wrong-code join
    // centrally). It reaches across any groups, so it's strictly ADMIN-only.
    reassignMember: async (
      _parent: unknown,
      args: { input: { userId: string; groupId: string } },
      context: Context,
    ) => {
      await requireAdmin(context); // only the site admin, reusing our helper
      const { userId, groupId } = args.input;

      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        throw new GraphQLError('No user found with that id.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group || group.deletedAt) {
        throw new GraphQLError('Group not found.', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      return prisma.user.update({
        where: { id: userId },
        data: { groupId },
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
  // Computed fields on Group.
  Group: {
    // Count members on demand (users whose groupId points at this group).
    memberCount: (parent: { id: string }) =>
      prisma.user.count({ where: { groupId: parent.id, deletedAt: null } }),

    // Fetch the creator row from the stored creatorId.
    creator: (parent: { creatorId: string }) =>
      prisma.user.findUnique({ where: { id: parent.creatorId } }),

    // DB gives a Date; the schema field is String!, so convert to ISO text.
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
  },

  // A user's group membership (null if they belong to none).
  User: {
    group: (parent: { groupId: string | null }) =>
      parent.groupId
        ? prisma.group.findUnique({ where: { id: parent.groupId } })
        : null,
  },
};