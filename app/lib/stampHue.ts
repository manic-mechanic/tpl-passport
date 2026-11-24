import { getStampColor } from '@tpl-passport/shared'

// The hue of a branch's stamp ink, for drawings in the same colour (ink
// specks, the facade). Read from getStampColor so it can't drift from it.
export function stampHue(wardNo: string | number): number {
  const match = /hsl\((\d+)/.exec(getStampColor(wardNo).color)
  return match ? Number(match[1]) : 350
}
