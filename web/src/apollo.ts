import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'
import { getToken } from './auth'

// The GraphQL API URL. Set VITE_API_URL at build time for production;
// falls back to the local dev server otherwise.
const httpLink = new HttpLink({ uri: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/' })

// Before every request, attach the login token (if we have one) as a
// standard "Authorization: Bearer <token>" header. The server reads this
// header to know which user is making the request.
const authLink = new ApolloLink((operation, forward) => {
  const token = getToken()
  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  }))
  return forward(operation)
})

export const apolloClient = new ApolloClient({
  // authLink runs first (adds the header), then httpLink sends the request.
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
})
