// Each Toronto ward maps to a distinct ink colour for its stamps.
// We rotate through a palette of 10 hues across 25 wards.
const HUES = [350, 22, 43, 165, 215, 275, 130, 190, 310, 55]

export function useStampColor(wardNo) {
  const idx = ((parseInt(wardNo) || 1) - 1) % HUES.length
  const h = HUES[idx]
  return {
    color:  `hsl(${h}, 62%, 36%)`,
    bg:     `hsl(${h}, 62%, 94%)`,
    border: `hsl(${h}, 62%, 70%)`,
  }
}
