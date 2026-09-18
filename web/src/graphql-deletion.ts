import { gql } from '@apollo/client'

export const MY_DELETION_REQUEST = gql`
  query MyDeletionRequest {
    myDeletionRequest { id status createdAt }
  }
`
export const DELETION_REQUESTS = gql`
  query DeletionRequests {
    deletionRequests { id reason status createdAt surveyUsername email }
  }
`
export const REQUEST_DELETION = gql`
  mutation RequestDataDeletion($reason: String) {
    requestDataDeletion(reason: $reason) { id status }
  }
`
export const REVIEW_DELETION = gql`
  mutation ReviewDeletionRequest($id: ID!, $approve: Boolean!) {
    reviewDeletionRequest(id: $id, approve: $approve)
  }
`
