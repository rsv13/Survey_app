// A single shared PrismaClient for the whole server.
// One client = one connection pool, so we make ONE here and import it everywhere.

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set — check server/.env');
}

const adapter = new PrismaPg({ connectionString });

// While developing, log the SQL Prisma runs so you can see what your
// resolvers actually do to the database.
export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});