// Skipping the location check is a dev-only feature. A saved "Location check:
// Off" from a dev or tester build, or NUXT_PUBLIC_BYPASS_GEOFENCE, must not
// switch the check off in production.
export function shouldSkipLocationCheck(opts: {
  isDev: boolean
  bypassGeofence: boolean
  profileBypass: boolean
}): boolean {
  return opts.isDev && (opts.bypassGeofence || opts.profileBypass)
}
