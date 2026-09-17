import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import Home from './pages/Home'
import Survey from './pages/Survey'
import About from './pages/About'
import Resources from './pages/Resources'
import SignIn from './pages/SignIn'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'survey', element: <Survey /> },
      { path: 'about', element: <About /> },
      { path: 'resources', element: <Resources /> },
      { path: 'sign-in', element: <SignIn /> },
    ],
  },
])
