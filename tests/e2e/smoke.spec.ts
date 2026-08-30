import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encodeClickWav } from './encodeClickWav'
import { encodeSineWav } from './encodeSineWav'

function deck(page: Page, id: 1 | 2) {
  return page.getByTestId(`deck-${id}`)
}

test('dual deck shell is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Web DJ' })).toBeVisible()
  await expect(deck(page, 1).getByTestId('play-pause')).toBeVisible()
  await expect(deck(page, 2).getByTestId('play-pause')).toBeVisible()
  await expect(deck(page, 1).getByTestId('load-input')).toBeAttached()
  await expect(deck(page, 2).getByTestId('load-input')).toBeAttached()
  await expect(deck(page, 1).getByTestId('play-pause')).toBeDisabled()
  await expect(deck(page, 2).getByTestId('play-pause')).toBeDisabled()
  await expect(page.getByTestId('mixer')).toBeVisible()
  await expect(page.getByTestId('crossfader')).toBeVisible()
  await expect(page.getByTestId('master-gain')).toBeVisible()
})

test('loads a wav, plays, seeks, and cues without restarting the page', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase1.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)

  await expect(left.getByTestId('track-title')).toHaveText('web-dj-phase1.wav')
  await expect(left.getByTestId('play-pause')).toBeEnabled()
  await expect(left.getByTestId('remaining')).toContainText('00:04')

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect.poll(async () => left.getByTestId('position').innerText()).not.toBe('00:00.0')

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Play')

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('position')).toHaveText('00:02.0')

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await left.getByTestId('cue').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Play')
  await expect(left.getByTestId('position')).toHaveText('00:00.0')
})

test('playing deck 1 does not start deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase3.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 2).getByTestId('load-input').setInputFiles(wavPath)

  await expect(deck(page, 1).getByTestId('track-title')).toHaveText('web-dj-phase3.wav')
  await expect(deck(page, 2).getByTestId('track-title')).toHaveText('web-dj-phase3.wav')

  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
  await expect
    .poll(async () => deck(page, 1).getByTestId('position').innerText())
    .not.toBe('00:00.0')
  await expect(deck(page, 2).getByTestId('position')).toHaveText('00:00.0')
})

test('mixer faders and crossfader curve update without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase4.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')

  const fader = page.getByTestId('channel-1-fader')
  await fader.evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(fader).toHaveValue('0')

  await fader.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await expect(fader).toHaveValue('1')

  await page.getByTestId('curve-sharp').click()
  await page.getByTestId('crossfader').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '1'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(page.getByTestId('crossfader')).toHaveValue('1')
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
})

test('analyzes BPM for a 120 BPM click track without blocking play', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-120bpm.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await expect(deck(page, 1).getByTestId('play-pause')).toBeEnabled()
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 1).getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, {
    timeout: 15_000,
  })
})
