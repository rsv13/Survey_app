import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client'
import { getToken } from './auth'

// Where the GraphQL API lives in development.
const httpLink = new HttpLink({ uri: 'http://localhost:4000/' })

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
