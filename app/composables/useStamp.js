// Deterministic stamp color, shape, font, rotation, and ink opacity per branch.
// Same inputs always produce the same outputs — each branch has a consistent visual identity.

const HUES = [350, 22, 43, 165, 215, 275, 130, 190, 310, 55]

export function getStampColor(wardNo) {
  const idx = ((parseInt(wardNo) || 1) - 1) % HUES.length
  const h = HUES[idx]
  return {
    color:  `hsl(${h}, 62%, 36%)`,
    bg:     `hsl(${h}, 62%, 94%)`,
    border: `hsl(${h}, 62%, 70%)`,
  }
}

const STAMP_SHAPES = [
  { borderRadius: '12px',  width: '100px', height: '100px' },  // square
  { borderRadius: '24px',  width: '100px', height: '100px' },  // soft square
  { borderRadius: '50%',   width: '90px',  height: '90px'  },  // circle
  { borderRadius: '50%',   width: '118px', height: '76px'  },  // landscape oval
  { borderRadius: '100px', width: '128px', height: '70px'  },  // landscape pill
]

// Three stamp fonts for visual variety — chosen deterministically per branch.
// References CSS custom properties so the actual font stack is defined in one place (main.css).
const STAMP_FONTS = [
  'var(--font-stamp)',          // Roboto Condensed — tight, official
  'var(--font-stamp-elite)',    // Special Elite — typewriter/vintage
  'var(--font-stamp-stencil)',  // Allerta Stencil — military, bold
]

// Simple polynomial hash — different primes keep the outputs decorrelated
function hashCode(str, mod, prime = 31) {
  let h = 0
  for (const c of String(str)) h = (h * prime + c.charCodeAt(0)) % mod
  return h
}

export function getStampShape(branchCode) {
  return STAMP_SHAPES[hashCode(branchCode, STAMP_SHAPES.length)]
}

export function getStampFont(branchCode) {
  return STAMP_FONTS[hashCode(branchCode, STAMP_FONTS.length, 17)]
}

// Returns degrees of rotation in the range -3.0 to +3.0 — gives each stamp a slight tilt
export function getStampRotation(branchCode) {
  const h = hashCode(branchCode, 13, 13)
  return (h - 6) * 0.5
}

// Returns ink opacity for stamp text in the range 0.82 to 0.99 — mimics uneven ink coverage
export function getStampOpacity(branchCode) {
  const h = hashCode(branchCode, 18, 19)
  return 0.82 + h * 0.01
}
