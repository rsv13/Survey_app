// src/index.ts
// Starts the GraphQL server: ties the schema and resolvers together and listens.

import 'dotenv/config'; // load server/.env FIRST, before anything reads process.env
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs } from './schema.js';       // the "menu" (what can be queried)
import { resolvers } from './resolvers.js';   // the "kitchen" (how data is fetched)

// Build the server from the schema + resolvers.
const server = new ApolloServer({ typeDefs, resolvers });

// Start listening on port 4000. This also serves Apollo Sandbox (a query
// playground) at the same URL, which we'll use to test the query.
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`GraphQL server ready at ${url}`);