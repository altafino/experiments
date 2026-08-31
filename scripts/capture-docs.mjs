/**
 * Refresh docs/screenshots while `npm run dev -- --port 5179` is running.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = path.join(root, 'docs/screenshots')
mkdirSync(outDir, { recursive: true })

function encodeClickWav(bpm = 120, durationSeconds = 8, sampleRate = 44100) {
  const frameCount = Math.floor(sampleRate * durationSeconds)
  const dataBytes = frameCount * 2
  const buffer = Buffer.alloc(44 + dataBytes)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataBytes, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataBytes, 40)
  const period = Math.round((60 / bpm) * sampleRate)
  const click = Math.floor(sampleRate * 0.004)
  for (let start = 0; start + click < frameCount; start += period) {
    for (let i = 0; i < click; i += 1) {
      const sample = 1 - i / click
      buffer.writeInt16LE(Math.round(sample * 32767), 44 + (start + i) * 2)
    }
  }
  return buffer
}

function deck(page, id) {
  return page.getByTestId(`deck-${id}`)
}

async function shot(page, name, fullPage = true) {
  await page.waitForTimeout(250)
  await page.screenshot({
    path: path.join(outDir, name),
    fullPage,
    animations: 'disabled',
  })
  console.log('wrote', name)
}

const wavPath = path.join(tmpdir(), 'web-dj-docs-120.wav')
writeFileSync(wavPath, encodeClickWav(120, 8))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://127.0.0.1:5179/', { waitUntil: 'networkidle' })

await shot(page, 'perform-empty.png', true)

await deck(page, 1).getByTestId('load-input').setInputFiles(wavPath)
await deck(page, 2).getByTestId('load-input').setInputFiles(wavPath)
await deck(page, 1).getByTestId('play-pause').waitFor({ state: 'visible' })
await page.waitForFunction(
  () => {
    const bpm = document.querySelector('[data-testid="deck-1"] [data-testid="bpm"]')
    return bpm && /12[0-2]\.\d{2} BPM/.test(bpm.textContent ?? '')
  },
  null,
  { timeout: 20_000 },
)

await deck(page, 1).getByTestId('seek-slider').evaluate((el) => {
  const input = /** @type {HTMLInputElement} */ (el)
  input.value = '2'
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
await deck(page, 2).getByTestId('seek-slider').evaluate((el) => {
  const input = /** @type {HTMLInputElement} */ (el)
  input.value = '2'
  input.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.waitForTimeout(500)
await shot(page, 'perform.png', true)
await shot(page, 'perform-viewport.png', false)

await page.getByTestId('display-mode-browse').click()
await page.getByTestId('library').waitFor()
await shot(page, 'browse.png', false)

await page.getByTestId('display-mode-info').click()
await page.getByTestId('display-info-1').waitFor()
await shot(page, 'info.png', false)

await page.getByTestId('display-mode-settings').click()
await page.getByTestId('midi').waitFor()
await shot(page, 'settings.png', false)

await browser.close()
console.log('done', outDir)
