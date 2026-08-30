import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CommandBus } from '../../src/commands/CommandBus'
import type { AudioEngineApi, DeckController, MixerController } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'
import { emptyMixerState } from '../../src/domain/MixerState'

function walkTsFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const full = path.join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      files.push(...walkTsFiles(full))
      continue
    }
    if (full.endsWith('.ts')) {
      files.push(full)
    }
  }
  return files
}

describe('audio engine isolation', () => {
  it('keeps vue out of audio, command, and domain layers', () => {
    const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
    const layers = ['src/audio', 'src/commands', 'src/domain', 'src/analysis', 'src/library']
    const vueImport = /from\s+['"]vue['"]/

    for (const layer of layers) {
      for (const file of walkTsFiles(path.join(root, layer))) {
        const source = readFileSync(file, 'utf8')
        expect(source, file).not.toMatch(vueImport)
      }
    }
  })

  it('dispatches transport commands without a Vue component', async () => {
    const snapshot = emptyDeckState(1)
    snapshot.durationSeconds = 30
    const deck: DeckController = {
      play: () => {
        snapshot.playing = true
      },
      pause: () => {
        snapshot.playing = false
      },
      cue: () => undefined,
      cueRelease: () => undefined,
      seek: () => undefined,
      setTempoPercent: () => undefined,
      setTempoRange: () => undefined,
      setPitchBend: () => undefined,
      setMasterTempo: () => undefined,
      setQuantize: () => undefined,
      hotCue: () => undefined,
      clearHotCue: () => undefined,
      loopIn: () => undefined,
      loopOut: () => undefined,
      reloop: () => undefined,
      beatLoop: () => undefined,
      loopHalve: () => undefined,
      loopDouble: () => undefined,
      getSnapshot: () => snapshot,
    }
    const mixer: MixerController = {
      setTrim: () => undefined,
      setEq: () => undefined,
      setChannelFader: () => undefined,
      setCrossfader: () => undefined,
      setCrossfaderCurve: () => undefined,
      setMasterGain: () => undefined,
      getSnapshot: () => emptyMixerState(),
    }
    const engine: AudioEngineApi = {
      ensureStarted: async () => undefined,
      load: async () => undefined,
      getDeck: () => deck,
      tryGetDeck: () => deck,
      getMixer: () => mixer,
      tryGetMixer: () => mixer,
      setMasterDeck: () => undefined,
      setSync: () => undefined,
      ensureMaster: () => undefined,
      maintainSync: () => undefined,
    }

    const bus = new CommandBus(engine)
    await bus.dispatch({ type: 'DECK_PLAY', deck: 1 })
    expect(snapshot.playing).toBe(true)
    await bus.dispatch({ type: 'DECK_PAUSE', deck: 1 })
    expect(snapshot.playing).toBe(false)
  })
})
