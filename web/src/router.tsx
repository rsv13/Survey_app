import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from './components/RootLayout'
import Home from './pages/Home'
import Survey from './pages/Survey'
import About from './pages/About'
import Resources from './pages/Resources'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import VerifyEmail from './pages/VerifyEmail'
import MyResults from './pages/MyResults'
import Groups from './pages/Groups'
import { RequireAuth } from './components/RequireAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'survey', element: <RequireAuth><Survey /></RequireAuth> },
      { path: 'results', element: <RequireAuth><MyResults /></RequireAuth> },
      { path: 'groups', element: <RequireAuth><Groups /></RequireAuth> },
      { path: 'about', element: <About /> },
      { path: 'resources', element: <Resources /> },
      { path: 'sign-in', element: <SignIn /> },
      { path: 'sign-up', element: <SignUp /> },
      { path: 'verify', element: <VerifyEmail /> },
    ],
  },
])
