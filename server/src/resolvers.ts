// Resolvers are the functions that fetch the data for each field in the schema.
// The shape of this object mirrors the schema: Query.surveyDefinition here
// matches "type Query { surveyDefinition }" in schema.ts.

import { prisma } from './lib/prisma.js'; // the shared database client

export const resolvers = {
  Query: {
    // Runs whenever a client asks for `surveyDefinition`.
    // Returns everything the survey form needs, in one query.
    surveyDefinition: async () => {
      // The 14 questions — active only, in display order (1..14).
      const questions = await prisma.surveyQuestion.findMany({
        where: { active: true },
        orderBy: { order: 'asc' },
      });

      // The "sector" dropdown options.
      const sectors = await prisma.surveyOption.findMany({
        where: { category: 'SECTOR', active: true },
        orderBy: { order: 'asc' },
      });

      // The "education" dropdown options.
      const educationLevels = await prisma.surveyOption.findMany({
        where: { category: 'EDUCATION', active: true },
        orderBy: { order: 'asc' },
      });

      // These keys (questions / sectors / educationLevels) must match the
      // SurveyDefinition fields in the schema — GraphQL maps them by name.
      return { questions, sectors, educationLevels };
    },
  },
};