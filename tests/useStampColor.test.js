import { describe, it, expect } from 'vitest'
import { useStampColor } from '../app/composables/useStamp.js'

describe('useStampColor', () => {
  it('returns color, bg, and border for a valid ward', () => {
    const result = useStampColor(1)
    expect(result).toHaveProperty('color')
    expect(result).toHaveProperty('bg')
    expect(result).toHaveProperty('border')
  })

  it('returns HSL strings', () => {
    const { color, bg, border } = useStampColor(5)
    expect(color).toMatch(/^hsl\(/)
    expect(bg).toMatch(/^hsl\(/)
    expect(border).toMatch(/^hsl\(/)
  })

  it('returns different colors for different wards', () => {
    const a = useStampColor(1)
    const b = useStampColor(4)
    expect(a.color).not.toBe(b.color)
  })

  it('handles ward numbers outside 1–25 without throwing', () => {
    expect(() => useStampColor(0)).not.toThrow()
    expect(() => useStampColor(99)).not.toThrow()
    expect(() => useStampColor(null)).not.toThrow()
  })

  it('returns consistent results for the same ward', () => {
    expect(useStampColor(10)).toEqual(useStampColor(10))
  })
})
