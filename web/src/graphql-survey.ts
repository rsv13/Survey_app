import { gql } from '@apollo/client'

// Everything needed to render the survey: the 14 questions plus the sector and
// education dropdown options.
export const SURVEY_DEFINITION = gql`
  query SurveyDefinition {
    surveyDefinition {
      questions { id order text factor }
      sectors { id label order }
      educationLevels { id label order }
    }
  }
`

// Whether the signed-in user may submit now, and when they next can.
export const SURVEY_ELIGIBILITY = gql`
  query SurveyEligibility {
    surveyEligibility {
      canSubmit
      nextEligibleAt
      cooldownDays
    }
  }
`

// Submit a completed survey. Returns the scored response.
export const SUBMIT_SURVEY = gql`
  mutation SubmitSurvey($input: SubmitSurveyInput!) {
    submitSurvey(input: $input) {
      id
      totalScore
      createdAt
      subscaleScores { factor name score }
    }
  }
`

// The signed-in user's own submissions (role-scoped by the server), newest or
// oldest as we sort them client-side. Used by the My Results page.
export const MY_RESPONSES = gql`
  query MyResponses {
    surveyResponses {
      id
      totalScore
      createdAt
      subscaleScores { factor name score }
    }
  }
`
