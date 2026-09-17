import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'

// The GraphQL client, pointed at your local API.
export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: 'http://localhost:4000/' }),
  cache: new InMemoryCache(),
})
