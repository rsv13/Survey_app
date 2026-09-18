import { gql } from '@apollo/client'

// Aggregated stats for a group (or all groups the admin oversees when groupId
// is null). Scoped and permission-checked by the server.
export const GROUP_ANALYTICS = gql`
  query GroupAnalytics($groupId: ID) {
    groupAnalytics(groupId: $groupId) {
      responseCount
      participantCount
      totalScore { mean sd ci95Lower ci95Upper min max }
      distribution { label from to count }
      subscales { factor name mean }
      items { order text factor mean n }
    }
  }
`

// Break the group down by one demographic field. Segments with fewer than 5
// people are suppressed (mean hidden) to protect anonymity.
export const DEMOGRAPHIC_BREAKDOWN = gql`
  query DemographicBreakdown($dimension: DemographicDimension!, $groupId: ID) {
    demographicBreakdown(dimension: $dimension, groupId: $groupId) {
      dimension
      segments { label n suppressed mean ci95Lower ci95Upper }
    }
  }
`

// The wide, SPSS-friendly CSV export as a string (we turn it into a download).
export const EXPORT_CSV = gql`
  query ExportCsv($groupId: ID, $userId: ID) {
    exportResponsesCsv(groupId: $groupId, userId: $userId)
  }
`
