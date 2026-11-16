import { describe, it, expect } from 'vitest'
import { sentryIgnoreErrors } from '../app/lib/sentryIgnore'

const ignored = (message: string) => sentryIgnoreErrors.some(re => re.test(message))

describe('sentryIgnoreErrors', () => {
  it("ignores Microsoft's link-scanner rejection", () => {
    expect(ignored('Non-Error promise rejection captured with value: Object Not Found Matching Id:2, MethodName:update, ParamCount:4')).toBe(true)
  })

  it('keeps real errors', () => {
    expect(ignored('TypeError: Failed to fetch')).toBe(false)
    expect(ignored('Object not found')).toBe(false)
  })
})
