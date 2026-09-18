import { gql } from '@apollo/client'

// Full account details for the profile page.
export const PROFILE = gql`
  query Profile {
    me {
      id
      username
      email
      role
      emailVerified
      surveyUsername
      avatar
      group { id name }
    }
  }
`

export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword) { id }
  }
`

export const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($avatar: String!) {
    updateAvatar(avatar: $avatar) { id avatar }
  }
`
