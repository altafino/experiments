import type { DeckId } from '../../commands/DJCommand'
import type { DeckState } from '../../domain/DeckState'
import {
  phaseRateMultiplier,
  rangeForTempoPercent,
  syncPlaybackRate,
  tempoPercentFromRate,
  beatPhase,
  wrappedPhaseError,
} from '../../domain/sync'
import { clampTempoPercent, type TempoRange } from '../../domain/tempo'

export interface SyncParticipant {
  readonly deckId: DeckId
  getSnapshot(): DeckState
  originalBpm(): number | undefined
  firstBeatSeconds(): number | undefined
  setMasterDeck(enabled: boolean): void
  setSyncEnabled(enabled: boolean): void
  setSyncTempoPercent(percent: number): void
  applyPhaseMultiplier(multiplier: number): void
  setTempoRange(range: TempoRange): void
  tempoRange(): TempoRange
}

function otherDeck(deck: DeckId): DeckId {
  switch (deck) {
    case 1:
      return 2
    case 2:
      return 1
    default: {
      const neverDeck: never = deck
      return neverDeck
    }
  }
}

/**
 * Cross-deck BPM and beat-phase lock. Uses tempo adjustments only — never seek.
 */
export class SyncEngine {
  private readonly decks: { 1: SyncParticipant; 2: SyncParticipant }

  constructor(deck1: SyncParticipant, deck2: SyncParticipant) {
    this.decks = { 1: deck1, 2: deck2 }
  }

  setMaster(deck: DeckId): void {
    const master = this.decks[deck]
    const other = this.decks[otherDeck(deck)]
    master.setSyncEnabled(false)
    master.applyPhaseMultiplier(1)
    master.setMasterDeck(true)
    other.setMasterDeck(false)
    this.follow()
  }

  setSync(deck: DeckId, enabled: boolean): void {
    const target = this.decks[deck]
    if (!enabled) {
      target.setSyncEnabled(false)
      target.applyPhaseMultiplier(1)
      return
    }
    if (target.getSnapshot().masterDeck) {
      return
    }
    const other = this.decks[otherDeck(deck)]
    if (!other.getSnapshot().masterDeck) {
      if (other.originalBpm() !== undefined || other.getSnapshot().durationSeconds > 0) {
        this.setMaster(other.deckId)
      } else {
        this.setMaster(deck)
        return
      }
    }
    if (target.getSnapshot().masterDeck) {
      return
    }
    target.setSyncEnabled(true)
    this.follow()
  }

  ensureMaster(deck: DeckId): void {
    if (this.decks[1].getSnapshot().masterDeck || this.decks[2].getSnapshot().masterDeck) {
      return
    }
    this.setMaster(deck)
  }

  follow(): void {
    const master = this.findMaster()
    if (!master) {
      return
    }
    const slaveId = otherDeck(master.deckId)
    const slave = this.decks[slaveId]
    if (!slave.getSnapshot().syncEnabled) {
      slave.applyPhaseMultiplier(1)
      return
    }
    this.matchBpm(master, slave)
    this.matchPhase(master, slave)
  }

  private findMaster(): SyncParticipant | undefined {
    if (this.decks[1].getSnapshot().masterDeck) {
      return this.decks[1]
    }
    if (this.decks[2].getSnapshot().masterDeck) {
      return this.decks[2]
    }
    return undefined
  }

  private matchBpm(master: SyncParticipant, slave: SyncParticipant): void {
    const masterBpm = master.getSnapshot().effectiveBpm
    const slaveBpm = slave.originalBpm()
    if (masterBpm === undefined || slaveBpm === undefined) {
      return
    }
    const rate = syncPlaybackRate(masterBpm, slaveBpm)
    const percent = tempoPercentFromRate(rate)
    const needed = rangeForTempoPercent(percent)
    if (needed > slave.tempoRange()) {
      slave.setTempoRange(needed)
    }
    slave.setSyncTempoPercent(clampTempoPercent(percent, slave.tempoRange()))
  }

  private matchPhase(master: SyncParticipant, slave: SyncParticipant): void {
    const masterSnap = master.getSnapshot()
    const slaveSnap = slave.getSnapshot()
    const masterBpm = master.originalBpm()
    const slaveBpm = slave.originalBpm()
    const masterBeat = master.firstBeatSeconds()
    const slaveBeat = slave.firstBeatSeconds()
    if (
      !masterSnap.playing ||
      !slaveSnap.playing ||
      masterBpm === undefined ||
      slaveBpm === undefined ||
      masterBeat === undefined ||
      slaveBeat === undefined
    ) {
      slave.applyPhaseMultiplier(1)
      return
    }
    const error = wrappedPhaseError(
      beatPhase(masterSnap.positionSeconds, masterBeat, masterBpm),
      beatPhase(slaveSnap.positionSeconds, slaveBeat, slaveBpm),
    )
    slave.applyPhaseMultiplier(phaseRateMultiplier(error))
  }
}
