import type { Branch } from '@tpl-passport/shared'

// Branch names under a stamp: a few long names get their everyday short
// form, and a slash may break ("Pape/Danforth"). Names have no " Branch"
// suffix to strip ("Long Branch" is a name).
const STAMP_LABELS: Record<string, string> = {
  CL: 'North York',
  OV: 'Oakwood Village',
  TRL: 'Reference Library',
}

export function stampLabel(b: Branch): string {
  return (STAMP_LABELS[b.BranchCode] ?? b.BranchName).replace(/\//g, '/​')
}
