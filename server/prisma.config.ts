// prisma.config.ts
// Configuration for the Prisma command-line tool (migrations, etc.).
// In Prisma 7 the database connection URL lives here, not in schema.prisma.

import "dotenv/config"; // load variables from server/.env into process.env
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma", // where the schema file lives
  migrations: {
    path: "prisma/migrations", // where migration files are stored
  },
  datasource: {
    url: env("DATABASE_URL"), // the database connection string, read from .env
  },
});
