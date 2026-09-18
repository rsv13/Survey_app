import { gql } from '@apollo/client'

// The currently logged-in user (null if not signed in). Used to restore
// the session after a page refresh.
export const ME = gql`
  query Me {
    me {
      id
      username
      email
      role
      emailVerified
    }
  }
`

// Create an account. Returns the new user, but does NOT log you in —
// you still have to verify your email first.
export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      id
      email
      emailVerified
    }
  }
`

// Confirm the email address with the token from the verification email.
// Returns a login token + the user, so verifying also signs you in.
export const VERIFY_EMAIL = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      token
      user { id username email role emailVerified }
    }
  }
`

// Log in. Returns a login token + the user (only works once the email
// has been verified).
export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      token
      user { id username email role emailVerified }
    }
  }
`
