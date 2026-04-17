import { test, expect } from '@playwright/test'
import path from 'node:path'
import { createCheckIn, disableLocationCheck } from './helpers'

test('anonymous check-in with note/photo appears in history memories', async ({ page }) => {
  await disableLocationCheck(page)
  await createCheckIn(page, 'Playwright regression note')

  const photoPath = path.resolve(process.cwd(), 'tests/e2e/fixtures/photo.png')
  await page.locator('input.photo-input').setInputFiles(photoPath)
  await expect(page.getByRole('button', { name: 'Save photo' })).toBeVisible()

  await page.goto('/history')
  await page.getByRole('button', { name: 'Memories' }).click()
  await expect(page.getByText('No memories yet')).toHaveCount(0)
})
