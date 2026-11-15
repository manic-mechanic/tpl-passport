import { describe, expect, it } from 'vitest'
import { sentryDataCollection } from '../app/lib/sentryDataCollection'

// Sentry v11 collects these categories by default when they are unset, so
// guard the v10-equivalent restrictive values.
describe('sentryDataCollection', () => {
  it('keeps user info, cookies, bodies and query data off', () => {
    expect(sentryDataCollection.userInfo).toBe(false)
    expect(sentryDataCollection.cookies).toBe(false)
    expect(sentryDataCollection.httpBodies).toEqual([])
    expect(sentryDataCollection.databaseQueryData).toBe(false)
    expect(sentryDataCollection.queues).toBe(false)
  })

  it('keeps AI, MCP and GraphQL payloads off', () => {
    expect(sentryDataCollection.genAI).toEqual({ inputs: false, outputs: false })
    expect(sentryDataCollection.mcp).toEqual({ inputs: false, outputs: false })
    expect(sentryDataCollection.graphQL).toEqual({ document: false, variables: false })
  })

  it('filters PII headers and query params', () => {
    const deny = { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] }
    expect(sentryDataCollection.httpHeaders).toEqual({ request: deny, response: deny })
    expect(sentryDataCollection.urlQueryParams).toEqual(deny)
  })

  it('keeps the v10 stack-frame context', () => {
    expect(sentryDataCollection.frameContextLines).toBe(7)
  })
})
