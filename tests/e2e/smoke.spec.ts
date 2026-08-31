import { expect, test, type Page } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { encodeClickWav } from './encodeClickWav'
import { encodeSineWav } from './encodeSineWav'

function deck(page: Page, id: 1 | 2) {
  return page.getByTestId(`deck-${id}`)
}

async function openDisplayMode(
  page: Page,
  mode: 'performance' | 'browse' | 'info' | 'settings',
): Promise<void> {
  await page.getByTestId(`display-mode-${mode}`).click()
}

async function selectPadBank(page: Page, bank: 'hotcue' | 'loop' | 'jump'): Promise<void> {
  await deck(page, 1).getByTestId(`pad-bank-${bank}`).click()
}

function positionSeconds(text: string): number {
  const match = /(\d{2}):(\d{2})\.(\d)/.exec(text)
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
  await expect(page.getByTestId('channel-1-color')).toBeVisible()
  await expect(page.getByTestId('channel-1-color-fx-filter')).toBeVisible()
  await expect(page.getByTestId('channel-2-color-fx-pitch')).toBeVisible()
  await expect(page.getByTestId('beat-fx')).toBeVisible()
  await expect(page.getByTestId('beat-fx-echo')).toBeVisible()
  await expect(page.getByTestId('beat-fx-on')).toBeVisible()
  await expect(page.getByTestId('channel-1-cue')).toBeVisible()
  await expect(page.getByTestId('channel-2-cue')).toBeVisible()
  await expect(page.getByTestId('cue-mix')).toBeVisible()
  await expect(page.getByTestId('phones-level')).toBeVisible()
  await expect(page.getByTestId('record')).toBeVisible()
  await expect(deck(page, 1).getByTestId('hot-cue-A')).toBeVisible()
  await expect(deck(page, 1).getByTestId('quantize')).toBeVisible()
  await selectPadBank(page, 'loop')
  await expect(deck(page, 1).getByTestId('loop-in')).toBeVisible()
  await expect(deck(page, 1).getByTestId('loop-beat-4')).toBeVisible()
  await selectPadBank(page, 'jump')
  await expect(deck(page, 1).getByTestId('beat-jump-p1')).toBeVisible()
  await expect(page.getByTestId('main-display')).toBeVisible()
  await expect(page.getByTestId('main-display-1')).toBeVisible()
  await expect(page.getByTestId('scrolling-waveform-1')).toBeVisible()
  await expect(page.getByTestId('scrolling-waveform-2')).toBeVisible()
  await expect(deck(page, 1).getByTestId('slip')).toBeVisible()
  await expect(deck(page, 1).getByTestId('jog')).toBeVisible()
  await expect(deck(page, 1).getByTestId('vinyl')).toBeVisible()
  await expect(deck(page, 1).getByTestId('platter-load')).toBeVisible()
})

test('main display switches between performance, browse, info and settings', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('display-zoom')).toHaveText('8s')
  await page.getByTestId('display-zoom-in').click()
  await expect(page.getByTestId('display-zoom')).toHaveText('4s')

  await openDisplayMode(page, 'browse')
  await expect(page.getByTestId('library')).toBeVisible()
  await expect(page.getByTestId('library-import')).toBeAttached()
  await expect(page.getByTestId('scrolling-waveform-1')).toBeHidden()

  await openDisplayMode(page, 'info')
  await expect(page.getByTestId('display-info-1')).toBeVisible()
  await expect(page.getByTestId('display-info-2')).toBeVisible()

  await openDisplayMode(page, 'settings')
  await expect(page.getByTestId('midi')).toBeVisible()
  await expect(page.getByTestId('midi-connect')).toBeVisible()
  await expect(page.getByTestId('keyboard-help')).toBeVisible()

  await openDisplayMode(page, 'performance')
  await expect(page.getByTestId('scrolling-waveform-1')).toBeVisible()
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

test('color fx selector and knob update without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase13.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')

  const color = page.getByTestId('channel-1-color')
  await expect(page.getByTestId('channel-1-color-fx-filter')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('channel-1-color-fx-noise').click()
  await expect(page.getByTestId('channel-1-color-fx-noise')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('channel-1-color-fx-filter')).toHaveAttribute('aria-pressed', 'false')

  await color.evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0.9'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(color).toHaveValue('0.9')

  await color.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await expect(color).toHaveValue('0.5')
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('beat fx selector and timing update without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase14.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')

  await expect(page.getByTestId('beat-fx-echo')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('beat-fx-beat-1-2')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('beat-fx-on')).toHaveAttribute('aria-pressed', 'false')

  await page.getByTestId('beat-fx-reverb').click()
  await expect(page.getByTestId('beat-fx-reverb')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('beat-fx-beat-1').click()
  await expect(page.getByTestId('beat-fx-beat-1')).toHaveAttribute('aria-pressed', 'true')
  await page.getByTestId('beat-fx-on').click()
  await expect(page.getByTestId('beat-fx-on')).toHaveAttribute('aria-pressed', 'true')

  const level = page.getByTestId('beat-fx-level')
  await level.evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0.8'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(level).toHaveValue('0.8')
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('headphone cue and mix update without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase15.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')

  await expect(page.getByTestId('channel-1-cue')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('cue-mix')).toHaveValue('1')
  await expect(page.getByTestId('phones-level')).toHaveValue('1')

  await page.getByTestId('channel-1-cue').click()
  await expect(page.getByTestId('channel-1-cue')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('channel-2-cue')).toHaveAttribute('aria-pressed', 'false')

  const mix = page.getByTestId('cue-mix')
  await mix.evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0.25'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(mix).toHaveValue('0.25')

  const phones = page.getByTestId('phones-level')
  await phones.evaluate((el) => {
    const input = el as HTMLInputElement
    input.value = '0.6'
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(phones).toHaveValue('0.6')

  await mix.evaluate((el) => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
  await expect(mix).toHaveValue('1')

  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('library import loads onto deck 1 without starting deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase16.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await openDisplayMode(page, 'browse')
  await page.getByTestId('library-import').setInputFiles(wavPath)
  await expect(page.getByTestId('library-row')).toHaveCount(1)
  await expect(page.getByTestId('library-row')).toContainText('web-dj-phase16')

  await page.getByTestId('library-playlist-name').fill('Warmup')
  await page.getByTestId('library-playlist-create').click()
  await page.getByTestId('library-playlist-add').click()
  await page.getByRole('button', { name: 'Warmup' }).click()
  await expect(page.getByTestId('library-row')).toHaveCount(1)

  await page.getByTestId('library-load-1').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toBeEnabled()
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('records the master bus without stopping playback', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase17.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const rec = page.getByTestId('record')

  await page.goto('/')
  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 1).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')

  await rec.click()
  await expect(rec).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(300)
  const [download] = await Promise.all([page.waitForEvent('download'), rec.click()])
  expect(download.suggestedFilename()).toMatch(/^web-dj-mix-.*\.webm$/)
  await expect(rec).toHaveAttribute('aria-pressed', 'false')
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('generic midi note plays deck 1 without starting deck 2', async ({ page }) => {
  await page.addInitScript(() => {
    const input = new EventTarget() as EventTarget & {
      id: string
      name: string
      state: string
    }
    input.id = 'generic-test'
    input.name = 'Generic Test'
    input.state = 'connected'
    const access = {
      inputs: {
        values() {
          return [input]
        },
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }
    Object.defineProperty(navigator, 'requestMIDIAccess', {
      configurable: true,
      value: () => Promise.resolve(access),
    })
    ;(window as Window & { __webDjSendMidi?: (status: number, data1: number, data2: number) => void }).__webDjSendMidi =
      (status, data1, data2) => {
        const event = new Event('midimessage')
        Object.defineProperty(event, 'data', { value: new Uint8Array([status, data1, data2]) })
        input.dispatchEvent(event)
      }
  })

  const wavPath = path.join(tmpdir(), 'web-dj-phase18.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.goto('/')
  await openDisplayMode(page, 'settings')
  await page.getByTestId('midi-connect').click()
  await expect(page.getByTestId('midi-status')).toContainText('Open')
  await expect(page.getByTestId('midi-status')).toContainText('Generic Test')

  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await expect(deck(page, 1).getByTestId('play-pause')).toBeEnabled()

  await page.evaluate(() => {
    const send = (window as Window & { __webDjSendMidi?: (a: number, b: number, c: number) => void }).__webDjSendMidi
    send?.(0x90, 60, 127)
  })
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
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
  await selectPadBank(page, 'loop')
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

test('beat jump advances four beats without starting deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase19-jump.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })
  await expect(page.getByTestId('main-display-1')).toBeVisible()
  await selectPadBank(page, 'jump')
  await left.getByTestId('beat-jump-p4').click()
  await expect.poll(async () => positionSeconds(await left.getByTestId('position').innerText())).toBeGreaterThan(1.8)
  await expect.poll(async () => positionSeconds(await left.getByTestId('position').innerText())).toBeLessThan(2.2)
  await expect(left.getByTestId('play-pause')).toHaveText('Play')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('loop in and out confine playback to the stored region', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase10-inout.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()

  await selectPadBank(page, 'loop')
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

test('slip loop jumps to the background timeline on exit', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase11-slip.wav')
  writeFileSync(wavPath, encodeClickWav(120, 8))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('bpm')).toHaveText(/12[0-2]\.\d{2} BPM/, { timeout: 15_000 })
  await left.getByTestId('slip').click()
  await expect(left.getByTestId('slip')).toHaveAttribute('aria-pressed', 'true')
  await selectPadBank(page, 'loop')
  await left.getByTestId('loop-beat-1').click()
  await expect(left.getByTestId('play-pause')).toHaveText('Pause')
  await expect(left.getByTestId('reloop')).toHaveAttribute('aria-pressed', 'true')

  const started = Date.now()
  await expect
    .poll(async () => {
      if (Date.now() - started < 1100) {
        return -1
      }
      return positionSeconds(await left.getByTestId('logical-position').innerText())
    })
    .toBeGreaterThanOrEqual(1)

  await left.getByTestId('reloop').click()
  await expect(left.getByTestId('reloop')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => positionSeconds(await left.getByTestId('position').innerText())).toBeGreaterThanOrEqual(1)
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('vinyl jog scratch moves the playhead without starting deck 2', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-phase12-jog.wav')
  writeFileSync(wavPath, encodeSineWav(4))
  const left = deck(page, 1)

  await page.goto('/')
  await left.getByTestId('load-input').setInputFiles(wavPath)
  await expect(left.getByTestId('play-pause')).toBeEnabled()
  await left.getByTestId('vinyl').click()
  await expect(left.getByTestId('vinyl')).toHaveAttribute('aria-pressed', 'true')

  const jog = left.getByTestId('jog')
  const box = await jog.boundingBox()
  expect(box).toBeTruthy()
  const cx = box!.x + box!.width / 2
  const cy = box!.y + box!.height / 2
  await page.mouse.move(cx, box!.y + 6)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width - 6, cy, { steps: 8 })
  await page.mouse.up()

  await expect.poll(async () => positionSeconds(await left.getByTestId('position').innerText())).toBeGreaterThan(0.2)
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Play')
})

test('decode error stays on the platter', async ({ page }) => {
  const badPath = path.join(tmpdir(), 'web-dj-bad.wav')
  writeFileSync(badPath, 'not a wav')

  await page.goto('/')
  await expect(deck(page, 1).getByTestId('platter-load')).toBeVisible()
  await deck(page, 1).getByTestId('load-input').setInputFiles(badPath)
  await expect(deck(page, 1).getByTestId('load-error')).toBeVisible()
  await expect(deck(page, 1).getByTestId('platter-load')).toBeVisible()
  await expect(deck(page, 2).getByTestId('platter-load')).toBeVisible()
})

test('chassis does not scroll the document at 1440', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(deck(page, 1).getByTestId('jog')).toBeVisible()
  await expect(deck(page, 2).getByTestId('jog')).toBeVisible()
  const box1 = await page.getByTestId('scrolling-waveform-1').boundingBox()
  const box2 = await page.getByTestId('scrolling-waveform-2').boundingBox()
  expect(box1).toBeTruthy()
  expect(box2).toBeTruthy()
  expect(box1!.x).toBeLessThan(box2!.x)
  const noScroll = await page.evaluate(() => {
    const root = document.scrollingElement
    return root !== null && root.scrollHeight <= root.clientHeight + 1
  })
  expect(noScroll).toBe(true)
})

test('narrow viewport stages the focused deck without pausing the peer', async ({ page }) => {
  const wavPath = path.join(tmpdir(), 'web-dj-narrow.wav')
  writeFileSync(wavPath, encodeSineWav(4))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(deck(page, 1).getByTestId('jog')).toBeVisible()
  await expect(deck(page, 2).getByTestId('jog')).toBeHidden()
  await expect(deck(page, 2).getByTestId('strip-title')).toBeVisible()
  await expect(deck(page, 2).getByTestId('play-pause')).toBeVisible()

  await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
  await deck(page, 2).getByTestId('load-input').setInputFiles(wavPath)
  await expect(deck(page, 1).getByTestId('play-pause')).toBeEnabled()
  await expect(deck(page, 2).getByTestId('play-pause')).toBeEnabled()
  await deck(page, 1).getByTestId('play-pause').click()
  await deck(page, 2).getByTestId('play-pause').click()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Pause')

  await deck(page, 2).click()
  await expect(deck(page, 2).getByTestId('jog')).toBeVisible()
  await expect(deck(page, 1).getByTestId('jog')).toBeHidden()
  await expect(deck(page, 1).getByTestId('strip-title')).toBeVisible()
  await expect(deck(page, 1).getByTestId('play-pause')).toHaveText('Pause')
  await expect(deck(page, 2).getByTestId('play-pause')).toHaveText('Pause')
})
