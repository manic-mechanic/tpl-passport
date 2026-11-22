import { describe, expect, it } from 'vitest'
import branches from '../packages/shared/data/branch-info.json'
import { matchesBranchSearch } from '../app/lib/branchSearch'

const names = (q: string) => branches.filter(b => matchesBranchSearch(b, q)).map(b => b.BranchName)

describe('matchesBranchSearch', () => {
  it('matches names and addresses at the start of a word, not neighbourhoods', () => {
    const park = names('park')
    expect(park).toEqual(expect.arrayContaining(['Humber Bay', 'Guildwood']))
    expect(park.some(n => n.includes('Park'))).toBe(true)
    for (const n of ['Armour Heights', 'Brookbanks', 'Dawes Road', 'Locke', 'Runnymede']) expect(park).not.toContain(n)
  })

  it('does not match inside a word', () => {
    expect(matchesBranchSearch({ BranchName: 'Sparkle', Address: '1 Main St' }, 'park')).toBe(false)
  })

  it('matches after punctuation and across words, ignoring case and spaces', () => {
    expect(matchesBranchSearch({ BranchName: 'St. Clair/Silverthorn', Address: '' }, 'silver')).toBe(true)
    expect(matchesBranchSearch({ BranchName: 'High Park', Address: '' }, '  HIGH PA ')).toBe(true)
  })

  it('treats regex characters literally, and an empty query matches everything', () => {
    expect(matchesBranchSearch({ BranchName: 'Agincourt', Address: '' }, '(')).toBe(false)
    expect(matchesBranchSearch({ BranchName: 'Agincourt', Address: '' }, ' ')).toBe(true)
  })
})
