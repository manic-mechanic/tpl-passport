// Pure, framework-agnostic deterministic stamp styling per branch.
// Same inputs always produce the same outputs — each branch has a consistent visual identity.

const HUES = [350, 22, 43, 165, 215, 275, 130, 190, 310, 55]

export function getStampColor(wardNo: string | number): { color: string; bg: string; border: string } {
  const idx = ((parseInt(String(wardNo)) || 1) - 1) % HUES.length
  const h = HUES[idx]
  return {
    color:  `hsl(${h}, 62%, 36%)`,
    bg:     `hsl(${h}, 62%, 94%)`,
    border: `hsl(${h}, 62%, 70%)`,
  }
}

const STAMP_SHAPES = [
  { borderRadius: '12px', width: '100px', height: '100px' },  // square
  { borderRadius: '24px', width: '100px', height: '100px' },  // soft square
  { borderRadius: '50%',  width: '90px',  height: '90px'  },  // circle
  { borderRadius: '50%',  width: '118px', height: '76px'  },  // landscape oval
  { borderRadius: '100px',width: '128px', height: '70px'  },  // landscape pill
]

const STAMP_FONTS = [
  'RobotoCondensed',  // tight, official
  'SpecialElite',     // typewriter/vintage
  'AllertaStencil',   // military, bold
]

// Simple polynomial hash — different primes keep outputs decorrelated.
function hashCode(str: string, mod: number, prime = 31): number {
  let h = 0
  for (const c of String(str)) h = (h * prime + c.charCodeAt(0)) % mod
  return h
}

export function getStampShape(branchCode: string): (typeof STAMP_SHAPES)[number] {
  return STAMP_SHAPES[hashCode(branchCode, STAMP_SHAPES.length)]
}

export function getStampFont(branchCode: string): string {
  return STAMP_FONTS[hashCode(branchCode, STAMP_FONTS.length, 17)]
}

export function getStampRotation(branchCode: string): number {
  const h = hashCode(branchCode, 13, 13)
  return (h - 6) * 0.5
}

export function getStampOpacity(branchCode: string): number {
  const h = hashCode(branchCode, 18, 19)
  return 0.82 + h * 0.01
}
