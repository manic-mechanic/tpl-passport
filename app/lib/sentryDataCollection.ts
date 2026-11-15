// Sentry v11 replaced `sendDefaultPii` with `dataCollection`, and leaving it
// unset now collects cookies, request/response bodies, headers, user info and
// DB query data by default. This app never set `sendDefaultPii`, so pin the
// v10 default (the baseline from Sentry's v10 → v11 migration guide) to keep
// collecting the same data as before. Shared by the client and server configs.
const DENY_PII = { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] }

export const sentryDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: DENY_PII,
    response: DENY_PII,
  },
  httpBodies: [],
  urlQueryParams: DENY_PII,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
}
