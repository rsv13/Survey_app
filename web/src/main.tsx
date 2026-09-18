import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from './apollo'
import { AuthProvider } from './AuthContext'
import { router } from './router'
import './index.css'

// Apply the saved theme before first paint to avoid a flash of the wrong colours.
try {
  const saved = localStorage.getItem('swswbs-theme')
  if (saved) document.documentElement.setAttribute('data-theme', saved)
} catch {
  // ignore — storage may be unavailable
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ApolloProvider gives components the GraphQL client;
        AuthProvider tracks who is signed in;
        RouterProvider renders the current page. */}
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ApolloProvider>
  </StrictMode>,
)
