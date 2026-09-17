// The GraphQL schema (SDL): what types exist and what queries/mutations are possible.

export const typeDefs = `#graphql
  # ---------- Enums (must match the Prisma enums) ----------

  enum Role { NORMAL_USER GROUP_ADMIN ADMIN }
  enum Gender { MALE FEMALE PREFER_NOT_TO_SAY OTHERS }
  enum AgeGroup { AGE_16_24 AGE_25_34 AGE_35_44 AGE_45_54 AGE_55_64 AGE_65_PLUS }
  enum AnswerScale { NONE_OF_THE_TIME RARELY SOME_OF_THE_TIME OFTEN ALL_OF_THE_TIME }

  # ---------- Survey definition (Phase 1) ----------

  type SurveyQuestion {
    id: ID!
    order: Int!
    text: String!
    factor: Int
  }

  type SurveyOption {
    id: ID!
    category: String!
    label: String!
    order: Int!
  }

  type SurveyDefinition {
    questions: [SurveyQuestion!]!
    sectors: [SurveyOption!]!
    educationLevels: [SurveyOption!]!
  }

  # ---------- Users / auth (Phase 2) ----------

  type User {
    id: ID!
    username: String!
    email: String!
    role: Role!
    emailVerified: Boolean!
    surveyUsername: String!
    avatar: String!
    group: Group # the group this user belongs to, if any (null = individual)
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input SignUpInput {
    username: String!
    email: String!
    password: String!
  }

  input SignInInput {
    email: String!
    password: String!
  }

    # ---------- Groups (Phase 4) ----------

  # A group gathers participants under one or more Group Admins so their responses can be analysed together.

  type Group {
    id: ID!
    name: String!
    description: String!
    inviteCode: String!     # the code a member enters to join
    creator: User!          # who created the group
    memberCount: Int!       # computed on demand, like totalScore
    createdAt: String!
  }

  input CreateGroupInput {
    name: String!
    description: String!
  }

  # A group admin adds a co-admin to one of their groups. The person must
  # ALREADY be a group admin (granted by the site admin) — this only shares
  # a group, it never hands out the role.
  input AddGroupAdminInput {
    email: String!
    groupId: ID!
  }

  input ReassignMemberInput {
    userId: ID!
    groupId: ID!
  }

  # ---------- Survey responses (Phase 3) ----------

  # One answer within a response (question + the chosen value + its 0..4 number).
  type SurveyAnswer {
    question: SurveyQuestion!
    value: AnswerScale!
    numericValue: Int!
  }

  # A per-factor (subscale) score for one response.
  type SubscaleScore {
    factor: Int!
    name: String!
    score: Int!
  }

  # Whether the current user may submit now, and when they next can.
  type SurveyEligibility {
    canSubmit: Boolean!
    nextEligibleAt: String
    cooldownDays: Int!
  }

  # A completed survey submission.
  type SurveyResponse {
    id: ID!
    surveyUsername: String!
    gender: Gender!
    ageGroup: AgeGroup!
    sector: SurveyOption!
    education: SurveyOption!
    designation: String!
    country: String!
    state: String!
    city: String!
    consent: Boolean!
    answers: [SurveyAnswer!]!
    totalScore: Int! # sum of the answers' numeric values (computed, not stored)
    subscaleScores: [SubscaleScore!]!
    createdAt: String!
  }

  # The shape sent when submitting: demographics + one entry per question.
  input SurveyAnswerInput {
    questionId: ID!
    value: AnswerScale!
  }

  input SubmitSurveyInput {
    gender: Gender!
    ageGroup: AgeGroup!
    sectorId: ID!
    educationId: ID!
    designation: String!
    country: String!
    state: String!
    city: String!
    consent: Boolean!
    answers: [SurveyAnswerInput!]!
  }

    # ---------- Analytics (Phase 5) ----------

  # Summary statistics for a set of total scores (14–70).
  type ScoreStat {
    mean: Float!
    sd: Float!            # sample standard deviation (spread of individuals)
    ci95Lower: Float!     # 95% confidence interval for the mean (approximate)
    ci95Upper: Float!
    min: Int!
    max: Int!
  }

  # One bar of the total-score histogram.
  type DistributionBin {
    label: String!
    from: Int!
    to: Int!
    count: Int!
  }

  # A subscale (factor) average, as a per-item mean (1–5) so factors compare.
  type FactorMean {
    factor: Int!
    name: String!
    mean: Float!
  }

  # A single question's average across the group (1–5).
  type ItemMean {
    order: Int!
    text: String!
    factor: Int
    mean: Float!
    n: Int!               # how many answered this item
  }

  # The aggregated view a group/admin dashboard renders.
  type GroupAnalytics {
    responseCount: Int!
    participantCount: Int!
    totalScore: ScoreStat!
    distribution: [DistributionBin!]!
    subscales: [FactorMean!]!
    items: [ItemMean!]!
  }

    # One submission in a participant's history.
  type ProgressPoint {
    date: String!         # when it was submitted (ISO timestamp)
    totalScore: Int!
    answered: Int!        # how many of the 14 items were answered
    subscales: [FactorMean!]!   # per-item mean (1–5) per factor, reused type
  }

  # A single participant's scores over time — their own, or a member a
  # group admin / site admin is reviewing. Always pseudonymised.
  type ParticipantProgress {
    surveyUsername: String!
    count: Int!
    points: [ProgressPoint!]!   # oldest first
  }

    # Which demographic field to break the group down by.
  enum DemographicDimension { SECTOR AGE_GROUP GENDER EDUCATION }

  # One value of that dimension (e.g. one sector), with its stats.
  type DemographicSegment {
    label: String!
    n: Int!
    suppressed: Boolean!   # true when n < 5: the mean is hidden to protect anonymity
    mean: Float            # null when suppressed
    ci95Lower: Float       # null when suppressed
    ci95Upper: Float       # null when suppressed
  }

  type DemographicBreakdown {
    dimension: DemographicDimension!
    segments: [DemographicSegment!]!
  }

  # ---------- Root types ----------

  type Query {
    surveyDefinition: SurveyDefinition!
    me: User
    surveyResponses: [SurveyResponse!]! # role-scoped: admin=all, group admin=their group, user=their own
    surveyEligibility: SurveyEligibility!
    groupAnalytics(groupId: ID): GroupAnalytics!  # GROUP_ADMIN or ADMIN; scoped by role
    participantProgress(userId: ID): ParticipantProgress!  # own, or a member you oversee
    demographicBreakdown(dimension: DemographicDimension!, groupId: ID): DemographicBreakdown!
  }

  type Mutation {
    signUp(input: SignUpInput!): User!
    verifyEmail(token: String!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    submitSurvey(input: SubmitSurveyInput!): SurveyResponse! # create a response + its answers
    # --- Groups ---
    grantGroupAdmin(email: String!): User!               # ADMIN only — elevate a normal user to Group Admin
    createGroup(input: CreateGroupInput!): Group!        # ADMIN or GROUP_ADMIN — create a group you own
    addGroupAdmin(input: AddGroupAdminInput!): Group!    # a group's admin adds a co-admin (already a Group Admin)
    reassignMember(input: ReassignMemberInput!): User!   # ADMIN only — move a user between groups
    joinGroup(inviteCode: String!): Group!               # any signed-in user joins as a member
    leaveGroup: User!                                    # a member leaves their own group
    removeMember(userId: ID!): User!                     # a Group Admin removes a member from their group
  }
`;