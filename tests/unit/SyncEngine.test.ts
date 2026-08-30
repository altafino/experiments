import { describe, expect, it } from 'vitest'
import type { SyncParticipant } from '../../src/audio/sync/SyncEngine'
import { SyncEngine } from '../../src/audio/sync/SyncEngine'
import type { DeckId } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'
import { tempoPercentFromRate } from '../../src/domain/sync'
import { DEFAULT_TEMPO_RANGE, type TempoRange } from '../../src/domain/tempo'

class FakeDeck implements SyncParticipant {
  readonly deckId: DeckId
  origBpm: number | undefined
  firstBeat: number | undefined
  phaseMul = 1
  private range: TempoRange = DEFAULT_TEMPO_RANGE
  private readonly state = emptyDeckState(1)

  constructor(deckId: DeckId) {
    this.deckId = deckId
    this.state.deckId = deckId
  }

  getSnapshot() {
    const rate = (1 + this.state.tempoPercent / 100) * this.phaseMul
    this.state.effectiveBpm =
      this.origBpm === undefined ? undefined : this.origBpm * rate
    return this.state
  }

  originalBpm(): number | undefined {
    return this.origBpm
  }

  firstBeatSeconds(): number | undefined {
    return this.firstBeat
  }

  setMasterDeck(enabled: boolean): void {
    this.state.masterDeck = enabled
    if (enabled) {
      this.state.syncEnabled = false
      this.phaseMul = 1
    }
  }

  setSyncEnabled(enabled: boolean): void {
    this.state.syncEnabled = enabled
    if (!enabled) {
      this.phaseMul = 1
    }
  }

  setSyncTempoPercent(percent: number): void {
    this.state.tempoPercent = percent
  }

  applyPhaseMultiplier(multiplier: number): void {
    this.phaseMul = multiplier
  }

  setTempoRange(range: TempoRange): void {
    this.range = range
    this.state.tempoRange = range
  }

  tempoRange(): TempoRange {
    return this.range
  }

  userSetTempo(percent: number): void {
    this.state.syncEnabled = false
    this.phaseMul = 1
    this.state.tempoPercent = percent
  }

  setPlaying(playing: boolean, position = 0): void {
    this.state.playing = playing
    this.state.positionSeconds = position
    this.state.durationSeconds = 120
  }
}

function pair(): { engine: SyncEngine; deck1: FakeDeck; deck2: FakeDeck } {
  const deck1 = new FakeDeck(1)
  const deck2 = new FakeDeck(2)
  return { engine: new SyncEngine(deck1, deck2), deck1, deck2 }
}

describe('SyncEngine', () => {
  it('matches slave BPM to the master without changing position', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 126
    deck2.origBpm = 128
    deck1.setPlaying(true, 1.25)
    deck2.setPlaying(true, 1.25)
    deck1.firstBeat = 0
    deck2.firstBeat = 0

    engine.setMaster(1)
    engine.setSync(2, true)

    expect(deck1.getSnapshot().masterDeck).toBe(true)
    expect(deck2.getSnapshot().syncEnabled).toBe(true)
    expect(deck2.getSnapshot().tempoPercent).toBeCloseTo(tempoPercentFromRate(126 / 128), 5)
    expect(deck2.getSnapshot().positionSeconds).toBe(1.25)
    expect(deck1.getSnapshot().positionSeconds).toBe(1.25)
  })

  it('widens the slave tempo range when the BPM gap exceeds the current range', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 138
    deck2.origBpm = 120
    deck1.setPlaying(true)
    deck2.setPlaying(true)

    engine.setMaster(1)
    engine.setSync(2, true)

    expect(deck2.tempoRange()).toBe(16)
    expect(deck2.getSnapshot().tempoPercent).toBeCloseTo(tempoPercentFromRate(138 / 120), 5)
  })

  it('nudges phase with a rate multiplier instead of seeking', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 120
    deck2.origBpm = 120
    deck1.firstBeat = 0
    deck2.firstBeat = 0
    deck1.setPlaying(true, 0)
    deck2.setPlaying(true, 0.05)

    engine.setMaster(1)
    engine.setSync(2, true)

    expect(deck2.getSnapshot().positionSeconds).toBe(0.05)
    expect(deck2.phaseMul).toBeLessThan(1)
  })

  it('keeps only one master and ignores SYNC on the master', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 120
    deck2.origBpm = 128
    deck1.setPlaying(true)
    deck2.setPlaying(true)

    engine.setMaster(1)
    engine.setSync(1, true)
    expect(deck1.getSnapshot().syncEnabled).toBe(false)

    engine.setMaster(2)
    expect(deck2.getSnapshot().masterDeck).toBe(true)
    expect(deck1.getSnapshot().masterDeck).toBe(false)
    expect(deck2.getSnapshot().syncEnabled).toBe(false)
  })

  it('leaves tempo in place when sync is turned off', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 126
    deck2.origBpm = 128
    deck1.setPlaying(true)
    deck2.setPlaying(true)

    engine.setMaster(1)
    engine.setSync(2, true)
    const locked = deck2.getSnapshot().tempoPercent
    engine.setSync(2, false)

    expect(deck2.getSnapshot().syncEnabled).toBe(false)
    expect(deck2.getSnapshot().tempoPercent).toBe(locked)
    expect(deck2.phaseMul).toBe(1)
  })

  it('promotes the other loaded deck to master when none is assigned', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 120
    deck1.setPlaying(false)
    deck2.origBpm = 128
    deck2.setPlaying(false)
    deck1.getSnapshot().durationSeconds = 60

    engine.setSync(2, true)

    expect(deck1.getSnapshot().masterDeck).toBe(true)
    expect(deck2.getSnapshot().syncEnabled).toBe(true)
  })

  it('does not follow after the user grabs the slave tempo', () => {
    const { engine, deck1, deck2 } = pair()
    deck1.origBpm = 126
    deck2.origBpm = 128
    deck1.setPlaying(true)
    deck2.setPlaying(true)

    engine.setMaster(1)
    engine.setSync(2, true)
    deck2.userSetTempo(4)
    engine.follow()

    expect(deck2.getSnapshot().syncEnabled).toBe(false)
    expect(deck2.getSnapshot().tempoPercent).toBe(4)
  })
})
