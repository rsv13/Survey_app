// The GraphQL schema (SDL): what types exist and what queries are possible.

export const typeDefs = `#graphql
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

  type Query {
    surveyDefinition: SurveyDefinition!
  }
`;