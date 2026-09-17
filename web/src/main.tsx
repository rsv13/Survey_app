import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ApolloProvider } from '@apollo/client/react'
import { apolloClient } from './apollo'
import { router } from './router'
import './index.css'

// Apply the saved theme before first paint to avoid a flash.
try {
  const saved = localStorage.getItem('swswbs-theme')
  if (saved) document.documentElement.setAttribute('data-theme', saved)
} catch {
  // ignore — storage may be unavailable
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </StrictMode>,
)
