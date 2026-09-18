import { gql } from '@apollo/client'

export const MY_NOTES = gql`
  query MyNotes {
    myNotes { id content createdAt }
  }
`
export const ADD_NOTE = gql`
  mutation AddNote($content: String!) {
    addNote(content: $content) { id content createdAt }
  }
`
export const DELETE_NOTE = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id)
  }
`
