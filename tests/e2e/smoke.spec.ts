import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encodeSineWav } from './encodeSineWav'

test('deck shell is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Web DJ' })).toBeVisible()
  await expect(page.getByTestId('play-pause')).toBeVisible()
  await expect(page.getByTestId('cue')).toBeVisible()
  await expect(page.getByTestId('load-input')).toBeAttached()
  await expect(page.getByTestId('waveform')).toBeVisible()
  await expect(page.getByTestId('play-pause')).toBeDisabled()
})

test('loads a wav, plays, seeks, and cues without restarting the page', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase1.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await page.getByTestId('load-input').setInputFiles(wavPath)

  await expect(page.getByTestId('track-title')).toHaveText('web-dj-phase1.wav')
  await expect(page.getByTestId('play-pause')).toBeEnabled()
  await expect(page.getByTestId('remaining')).toContainText('00:04')

  await page.getByTestId('play-pause').click()
  await expect(page.getByTestId('play-pause')).toHaveText('Pause')
  await expect.poll(async () => page.getByTestId('position').innerText()).not.toBe('00:00.0')

  await page.getByTestId('play-pause').click()
  await expect(page.getByTestId('play-pause')).toHaveText('Play')

  await page.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.getByTestId('position')).toHaveText('00:02.0')

  await page.getByTestId('play-pause').click()
  await expect(page.getByTestId('play-pause')).toHaveText('Pause')
  await page.getByTestId('cue').click()
  await expect(page.getByTestId('play-pause')).toHaveText('Play')
  await expect(page.getByTestId('position')).toHaveText('00:00.0')
})
