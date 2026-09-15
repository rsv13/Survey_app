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

  # ---------- Survey responses (Phase 3) ----------

  # One answer within a response (question + the chosen value + its 0..4 number).
  type SurveyAnswer {
    question: SurveyQuestion!
    value: AnswerScale!
    numericValue: Int!
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

  # ---------- Root types ----------

  type Query {
    surveyDefinition: SurveyDefinition!
    me: User
    surveyResponses: [SurveyResponse!]! # role-scoped: admin=all, group admin=their group, user=their own
  }

  type Mutation {
    signUp(input: SignUpInput!): User!
    verifyEmail(token: String!): AuthPayload!
    signIn(input: SignInInput!): AuthPayload!
    submitSurvey(input: SubmitSurveyInput!): SurveyResponse! # create a response + its answers
  }
`;