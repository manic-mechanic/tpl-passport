import { describe, it, expect } from 'vitest'
import { getStampColor, getStampShape, getStampFont, getStampRotation, getStampOpacity } from '../app/composables/useStamp.js'

describe('getStampColor', () => {
  it('returns color, bg, and border for a valid ward', () => {
    const result = getStampColor(1)
    expect(result).toHaveProperty('color')
    expect(result).toHaveProperty('bg')
    expect(result).toHaveProperty('border')
  })

  it('returns HSL strings', () => {
    const { color, bg, border } = getStampColor(5)
    expect(color).toMatch(/^hsl\(/)
    expect(bg).toMatch(/^hsl\(/)
    expect(border).toMatch(/^hsl\(/)
  })

  it('returns different colors for different wards', () => {
    const a = getStampColor(1)
    const b = getStampColor(4)
    expect(a.color).not.toBe(b.color)
  })

  it('handles ward numbers outside 1–25 without throwing', () => {
    expect(() => getStampColor(0)).not.toThrow()
    expect(() => getStampColor(99)).not.toThrow()
    expect(() => getStampColor(null)).not.toThrow()
  })

  it('returns consistent results for the same ward', () => {
    expect(getStampColor(10)).toEqual(getStampColor(10))
  })
})

describe('getStampShape', () => {
  it('returns an object with borderRadius, width, and height', () => {
    const shape = getStampShape('AG')
    expect(shape).toHaveProperty('borderRadius')
    expect(shape).toHaveProperty('width')
    expect(shape).toHaveProperty('height')
  })

  it('is deterministic — same code always returns the same shape', () => {
    expect(getStampShape('AG')).toEqual(getStampShape('AG'))
  })

  it('different codes can produce different shapes', () => {
    // With 5 shapes and a hash, not every pair will differ — but AG vs HP should
    const shapes = ['AG', 'HP', 'WH', 'MC', 'BL'].map(getStampShape)
    const unique = new Set(shapes.map(s => s.borderRadius))
    expect(unique.size).toBeGreaterThan(1)
  })
})

describe('getStampFont', () => {
  it('returns a CSS custom property reference', () => {
    expect(getStampFont('AG')).toMatch(/^var\(--font-stamp/)
  })

  it('is deterministic', () => {
    expect(getStampFont('HP')).toBe(getStampFont('HP'))
  })
})

describe('getStampRotation', () => {
  it('returns a number in the range -3.0 to +3.0', () => {
    const branches = ['AG', 'HP', 'WH', 'MC', 'BL', 'NO', 'SC', 'YO', 'ET', 'RH']
    for (const code of branches) {
      const r = getStampRotation(code)
      expect(r).toBeGreaterThanOrEqual(-3.0)
      expect(r).toBeLessThanOrEqual(3.0)
    }
  })

  it('is deterministic', () => {
    expect(getStampRotation('AG')).toBe(getStampRotation('AG'))
  })
})

describe('getStampOpacity', () => {
  it('returns a number in the range 0.82 to 0.99', () => {
    const branches = ['AG', 'HP', 'WH', 'MC', 'BL', 'NO', 'SC', 'YO', 'ET', 'RH']
    for (const code of branches) {
      const o = getStampOpacity(code)
      expect(o).toBeGreaterThanOrEqual(0.82)
      expect(o).toBeLessThanOrEqual(0.99)
    }
  })

  it('is deterministic', () => {
    expect(getStampOpacity('AG')).toBe(getStampOpacity('AG'))
  })
})
