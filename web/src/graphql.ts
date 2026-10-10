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
      avatar
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

// Confirm the email address by typing the 6-digit code (also signs you in).
export const VERIFY_EMAIL_CODE = gql`
  mutation VerifyEmailCode($email: String!, $code: String!) {
    verifyEmailCode(email: $email, code: $code) {
      token
      user { id username email role emailVerified }
    }
  }
`

// Re-send a fresh verification email (new code + link). Always "succeeds".
export const RESEND_VERIFICATION = gql`
  mutation ResendVerification($email: String!) {
    resendVerification(email: $email)
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

// Step 1 of reset: ask for a reset link (always "succeeds").
export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`

// Step 2 of reset: set a new password with the emailed token (signs you in).
export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      token
      user { id username email role emailVerified }
    }
  }
`
