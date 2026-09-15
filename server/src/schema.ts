// The GraphQL schema (SDL): what types exist and what queries/mutations are possible.

export const typeDefs = `#graphql
  # ---------- Survey (Phase 1) ----------

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

  # ---------- Auth (Phase 2) ----------

  enum Role {
    NORMAL_USER
    GROUP_ADMIN
    ADMIN
  }

  # The safe, public view of a user — note there is NO passwordHash here.
  # The schema controls exactly what can leave the server.
  type User {
    id: ID!
    username: String!
    email: String!
    role: Role!
    emailVerified: Boolean!
    surveyUsername: String!
    avatar: String!
  }

  # Returned after a successful login/verification: a token plus the user.
  type AuthPayload {
    token: String!
    user: User!
  }

  # Input types are the shape of arguments passed INTO a mutation.
  input SignUpInput {
    username: String!
    email: String!
    password: String!
  }

  input SignInInput {
    email: String!
    password: String!
  }

  # ---------- Root types ----------

  type Query {
    surveyDefinition: SurveyDefinition!
    me: User # the currently logged-in user, or null if not logged in
  }

  type Mutation {
    signUp(input: SignUpInput!): User! # creates the account (unverified)
    verifyEmail(token: String!): AuthPayload! # verifies the email AND logs in
    signIn(input: SignInInput!): AuthPayload! # logs in on return visits
  }
`;