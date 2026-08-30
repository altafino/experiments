import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encodeClickWav } from './encodeClickWav'
import { encodeSineWav } from './encodeSineWav'

function deck(page: Page, id: 1 | 2) {
  return page.getByTestId(`deck-${id}`)
}

function positionSeconds(text: string): number {
  const match = /^(\d{2}):(\d{2})\.(\d)$/.exec(text)
  if (!match) {
    return Number.NaN
  }
  return Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 10
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
  await expect(deck(page, 1).getByTestId('hot-cue-A')).toBeVisible()
  await expect(deck(page, 1).getByTestId('quantize')).toBeVisible()
  await expect(deck(page, 1).getByTestId('loop-in')).toBeVisible()
  await expect(deck(page, 1).getByTestId('loop-beat-4')).toBeVisible()
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
  await expect(deck(page, 1).getByTestId('play-pause')).toBeEnabled()

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

test('tempo slider and range update without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase6.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()
  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })

  await left.getByTestId('tempo-range-16').click()
  await left.getByTestId('tempo-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '16'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('tempo-percent')).toHaveText('+16.00%')
  await expect(left.getByTestId('original-bpm')).toContainText('orig')
  await expect(deck(page, 2).getByTestId('tempo-percent')).toHaveText('0.00%')

  await left.getByTestId('tempo-range-6').click()
  await expect(left.getByTestId('tempo-percent')).toHaveText('+6.00%')
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')

  await left.getByTestId('tempo-slider').evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await expect(left.getByTestId('tempo-percent')).toHaveText('0.00%')
})

test('master tempo toggles without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase7.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()
  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')

  const mt = left.getByTestId('master-tempo')
  await expect(mt).toHaveAttribute('aria-pressed', 'false')
  await mt.click()
  await expect(mt).toHaveAttribute('aria-pressed', 'true')
  await left.getByTestId('tempo-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '6'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('tempo-percent')).toHaveText('+6.00%')
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('master-tempo')).toHaveAttribute('aria-pressed', 'false')
})

test('sync matches slave tempo to the master without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase8.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)
  const right = deck(page, 2)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await right.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()
  await expect(right.getByTestId('play-pause')).toBeEnabled()
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })
  await expect(right.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(left.getByTestId('deck-master')).toHaveAttribute('aria-pressed', 'true')
  await expect(right.getByTestId('deck-master')).toHaveAttribute('aria-pressed', 'false')

  await right.getByTestId('sync').click()
  await expect(right.getByTestId('sync')).toHaveAttribute('aria-pressed', 'true')

  await left.getByTestId('tempo-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '6'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('tempo-percent')).toHaveText('+6.00%')
  await expect(right.getByTestId('tempo-percent')).toHaveText('+6.00%')
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(right.getByTestId('sync')).toHaveAttribute('aria-pressed', 'true')

  await right.getByTestId('play-pause').click()
  await expect(right.getByTestId('play-pause')).toHaveText('Pause')
  const slaveStart = positionSeconds(await right.getByTestId('position').innerText())
  await expect
    .poll(async () => positionSeconds(await right.getByTestId('position').innerText()))
    .toBeGreaterThan(slaveStart)
  await expect(right.getByTestId('position')).not.toHaveText('00:00.0')
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
})

test('memory cue returns to the stored point without starting deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase9-cue.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('position')).toHaveText('00:02.0')
  await left.getByTestId('cue').click()

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect.poll(async () => left.getByTestId('position').innerText()).not.toBe('00:02.0')

  await left.getByTestId('cue').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Play')
  await expect(left.getByTestId('position')).toHaveText('00:02.0')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
  await expect(deck(page, 2).getByTestId('position')).toHaveText('00:00.0')
})

test('hot cue jumps and plays without starting deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase9-hot.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await left.getByTestId('hot-cue-A').click()
  await expect(left.getByTestId('hot-cue-A')).toHaveAttribute('aria-pressed', 'true')
  await expect(left.getByTestId('hot-cue-A')).toHaveAttribute('data-position', '2.00')

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(left.getByTestId('position')).toHaveText('00:00.0')
  await left.getByTestId('hot-cue-A').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(left.getByTestId('position')).toHaveText(/^00:02\./)
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
  await expect(deck(page, 2).getByTestId('hot-cue-A')).toHaveAttribute('aria-pressed', 'false')
})

test('quantize snaps a new hot cue to the beat grid', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase9-q.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })
  await left.getByTestId('quantize').click()
  await expect(left.getByTestId('quantize')).toHaveAttribute('aria-pressed', 'true')

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0.12'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await left.getByTestId('hot-cue-B').click()
  await expect.poll(async () => {
    const value = await left.getByTestId('hot-cue-B').getAttribute('data-position')
    return Number(value)
  }).toBeLessThan(0.3)
  await expect(left.getByTestId('play-pause')).toHaveText('Play')
})

test('beat loop keeps the playhead inside one beat', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase10-beat.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })
  await left.getByTestId('loop-beat-1').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(left.getByTestId('reloop')).toHaveAttribute('aria-pressed', 'true')

  const started = Date.now()
  await expect
    .poll(async () => {
      if (Date.now() - started < 1100) {
        return Number.POSITIVE_INFINITY
      }
      return positionSeconds(await left.getByTestId('position').innerText())
    })
    .toBeLessThan(0.8)
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('loop in and out confine playback to the stored region', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase10-inout.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()

  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '1'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await left.getByTestId('loop-in').click()
  await left.getByTestId('seek-slider').evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '2'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await left.getByTestId('loop-out').click()
  await expect(left.getByTestId('reloop')).toHaveAttribute('aria-pressed', 'true')

  await left.getByTestId('play-pause').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  const started = Date.now()
  await expect
    .poll(async () => {
      if (Date.now() - started < 1300) {
        return -1
      }
      return positionSeconds(await left.getByTestId('position').innerText())
    })
    .toBeGreaterThanOrEqual(1)
  await expect.poll(async () => positionSeconds(await left.getByTestId('position').innerText())).toBeLessThan(2)
})
