import { apolloClient } from './apollo'
import { EXPORT_CSV } from './graphql-analytics'

// Fetches the CSV from the API and triggers a browser download.
// Pass a groupId for a whole group, a userId for one participant (or yourself),
// or neither (as an admin) for everything you can see.
export async function downloadResponsesCsv(opts: {
  groupId?: string | null
  userId?: string | null
  filename: string
}) {
  const { data } = await apolloClient.query<{ exportResponsesCsv: string }>({
    query: EXPORT_CSV,
    variables: { groupId: opts.groupId ?? null, userId: opts.userId ?? null },
    fetchPolicy: 'network-only',
  })
  const csv = data?.exportResponsesCsv ?? ''
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opts.filename
  a.click()
  URL.revokeObjectURL(url)
}
