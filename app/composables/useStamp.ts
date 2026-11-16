// Deterministic stamp color, shape, font, rotation, and ink opacity per branch.
// Same inputs always produce the same outputs — each branch has a consistent visual identity.
// The shared package holds the logic; only the fonts differ on the web, where
// they're CSS custom properties so the font stacks live in one place (main.css).
import { getStampFont as getStampFontIndex } from '@tpl-passport/shared'

export { getStampColor, getStampShape, getStampRotation, getStampOpacity } from '@tpl-passport/shared'

// Keyed by the shared package's font names, so each branch keeps the same font.
const WEB_STAMP_FONTS: Record<string, string> = {
  RobotoCondensed: 'var(--font-stamp)',         // tight, official
  SpecialElite:    'var(--font-stamp-elite)',   // typewriter/vintage
  AllertaStencil:  'var(--font-stamp-stencil)', // military, bold
}

export function getStampFont(branchCode: string): string {
  return WEB_STAMP_FONTS[getStampFontIndex(branchCode)] ?? 'var(--font-stamp)'
}
