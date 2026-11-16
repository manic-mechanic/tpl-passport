import { describe, it, expect } from 'vitest'
import { isAuthReachableFrom } from '../app/lib/authReachability'

describe('isAuthReachableFrom', () => {
  it('is true on the site and in local development', () => {
    expect(isAuthReachableFrom('www.librarypassport.ca')).toBe(true)
    expect(isAuthReachableFrom('librarypassport.ca')).toBe(true)
    expect(isAuthReachableFrom('127.0.0.1')).toBe(true)
    expect(isAuthReachableFrom('localhost')).toBe(true)
  })

  it('is false on Vercel deployment addresses', () => {
    expect(isAuthReachableFrom('tpl-passport-cudzspb8d-manic-mechanics-projects.vercel.app')).toBe(false)
    expect(isAuthReachableFrom('TPL-Passport-Git-Main.Vercel.App')).toBe(false)
  })

  it('does not treat look-alike hosts as Vercel', () => {
    expect(isAuthReachableFrom('notvercel.app')).toBe(true)
    expect(isAuthReachableFrom('vercel.app.example.com')).toBe(true)
  })
})
