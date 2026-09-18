import { gql } from '@apollo/client'

// Groups the signed-in admin manages, with their invite codes and members.
export const MY_GROUPS = gql`
  query MyGroups {
    myGroups {
      id
      name
      description
      inviteCode
      memberCount
      createdAt
      members { id surveyUsername role }
    }
  }
`

// A normal user's own membership (which group they're in, if any).
export const MEMBERSHIP = gql`
  query Membership {
    me { id role group { id name inviteCode } }
  }
`

export const CREATE_GROUP = gql`
  mutation CreateGroup($input: CreateGroupInput!) {
    createGroup(input: $input) { id name inviteCode }
  }
`

export const JOIN_GROUP = gql`
  mutation JoinGroup($inviteCode: String!) {
    joinGroup(inviteCode: $inviteCode) { id name }
  }
`

export const LEAVE_GROUP = gql`
  mutation LeaveGroup { leaveGroup { id } }
`

export const REMOVE_MEMBER = gql`
  mutation RemoveMember($userId: ID!) {
    removeMember(userId: $userId) { id }
  }
`

export const ADD_GROUP_ADMIN = gql`
  mutation AddGroupAdmin($input: AddGroupAdminInput!) {
    addGroupAdmin(input: $input) { id name }
  }
`

// Site-admin only: promote a normal user to Group Admin by email.
export const GRANT_GROUP_ADMIN = gql`
  mutation GrantGroupAdmin($email: String!) {
    grantGroupAdmin(email: $email) { id email role }
  }
`
