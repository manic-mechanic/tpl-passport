// Maps a branch name to the LocationName the TPL events feed (Toronto Open
// Data CKAN) uses for it. Used for the server's exact-match LocationName
// filter and for matching feed records back to branches in the app.
//
// - The feed uses straight apostrophes; branch data can have curly ones
//   ("Ethennonnhawahstihnen’" is "Ethennonnhawahstihnen'" in the feed).
// - A trailing " Branch" is dropped ("Agincourt Branch" -> "Agincourt"),
//   except where it is part of the branch's real name: the feed lists
//   "Long Branch" as "Long Branch", not "Long".

const NAMES_ENDING_IN_BRANCH = new Set(['long branch'])

export function eventLocationName(branchName: string): string {
  const name = branchName.replace(/[’‘`]/g, '\'').trim()
  if (NAMES_ENDING_IN_BRANCH.has(name.toLowerCase())) return name
  return name.replace(/(\S) Branch$/i, '$1')
}

// Case-insensitive key for matching a feed LocationName to a branch.
export function eventLocationKey(name: string): string {
  return eventLocationName(name).toLowerCase()
}
