import { describe, expect, it } from 'vitest'
import branches from '../packages/shared/data/branch-info.json'
import { branchSearchMatcher } from '../app/lib/branchSearch'

const names = (q: string, opts?: { withAddress?: boolean }) =>
  branches.filter(branchSearchMatcher(q, opts)).map(b => b.BranchName).sort()

describe('branchSearchMatcher', () => {
  it('matches the name and street at the start of a word, not the neighbourhood', () => {
    expect(names('park')).toEqual([
      'Amesbury Park', 'Deer Park', 'Elmbrook Park', 'Flemingdon Park', 'Goldhawk Park', 'High Park',
      'Humber Bay', // 200 Park Lawn Road
      'Maryvale', // Parkway Mall
      'McGregor Park', 'Parkdale',
      'S. Walter Stewart', // 170 Memorial Park Avenue
      'Thorncliffe', // 48 Thorncliffe Park Drive
      'Woodview Park',
    ])
    for (const n of ['Armour Heights', 'Brookbanks', 'Dawes Road', 'Locke', 'Runnymede']) expect(names('park')).not.toContain(n)
  })

  it('ignores the city, province and postal code the card does not show', () => {
    expect(names('toronto')).toEqual(['New Toronto', 'Toronto Reference Library'])
    expect(names('on')).toEqual(['Bookmobile One'])
    expect(names('m9v')).toEqual([])
  })

  it('matches names only for pickers that show no address', () => {
    expect(names('park', { withAddress: false })).not.toContain('Humber Bay')
    expect(names('park')).toContain('Humber Bay')
  })

  it('does not match inside a word', () => {
    expect(branchSearchMatcher('park')({ BranchName: 'Sparkle', Address: '1 Main St' })).toBe(false)
  })

  it('matches each word separately, ignoring punctuation, case and spaces', () => {
    expect(names('st clair')).toContain('St. Clair/Silverthorn')
    expect(names('lillian smith')).toContain('Lillian H. Smith')
    expect(branchSearchMatcher('  HIGH PA ')({ BranchName: 'High Park', Address: '' })).toBe(true)
  })

  it('treats regex characters as separators, and an empty query matches everything', () => {
    expect(names('(')).toHaveLength(branches.length)
    expect(names(' ')).toHaveLength(branches.length)
  })
})
