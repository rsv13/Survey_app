// Starts the GraphQL server: ties the schema and resolvers together and listens.

import 'dotenv/config'; // load server/.env FIRST, before anything reads process.env
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

import { typeDefs } from './schema.js';       // the "menu" (what can be queried)
import { resolvers } from './resolvers.js';   // the "kitchen" (how data is fetched)
import { buildContext, type Context } from './context.js'; // per-request auth context

// The <Context> tells Apollo (and TypeScript) the shape of context every resolver gets.
const server = new ApolloServer<Context>({ typeDefs, resolvers });

// Listen on the host-provided PORT (e.g. on Render/Railway), falling back to
// 4000 for local development. `context` runs on every request to read the token.
const port = Number(process.env.PORT) || 4000;
const { url } = await startStandaloneServer(server, {
  listen: { port, host: '0.0.0.0' },
  context: buildContext,
});

console.log(`GraphQL server ready at ${url}`);