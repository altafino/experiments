import type { DJCommand } from '../commands/DJCommand'
import {
  ccToTempoPercent,
  ccToUnit,
  MIDI_JOG_RADIANS_PER_TICK,
  midiSourceKey,
  midiTargetKey,
  relativeOffset64,
  type MidiBinding,
  type MidiCcEncoding,
  type MidiMessage,
  type MidiSource,
  type MidiTarget,
} from '../domain/midi'
import type { TempoRange } from '../domain/tempo'

export interface MidiMapContext {
  tempoRange(deck: 1 | 2): TempoRange
  channelCue(deck: 1 | 2): boolean
  syncEnabled(deck: 1 | 2): boolean
  slipEnabled(deck: 1 | 2): boolean
  vinylMode(deck: 1 | 2): boolean
  masterTempo(deck: 1 | 2): boolean
  quantizeEnabled(deck: 1 | 2): boolean
  beatFxEnabled(): boolean
  recording(): boolean
}

/**
 * Data-driven MIDI → DJCommand translator. Pioneer (or any vendor) maps
 * live in mappings/; this class does not embed controller-specific CCs.
 */
export class MidiMapper {
  private bindings: MidiBinding[] = []

  constructor(bindings: MidiBinding[] = []) {
    this.setBindings(bindings)
  }

  setBindings(bindings: MidiBinding[]): void {
    this.bindings = bindings.map((binding) => ({ ...binding, source: { ...binding.source }, target: { ...binding.target } }))
  }

  getBindings(): MidiBinding[] {
    return this.bindings.map((binding) => ({
      ...binding,
      source: { ...binding.source },
      target: { ...binding.target },
    }))
  }

  bind(target: MidiTarget, source: MidiSource, encoding: MidiCcEncoding): void {
    const targetKey = midiTargetKey(target)
    const sourceKey = midiSourceKey(source)
    this.bindings = this.bindings.filter(
      (binding) => midiTargetKey(binding.target) !== targetKey && midiSourceKey(binding.source) !== sourceKey,
    )
    this.bindings.push({ target, source, encoding })
  }

  unbind(targetKey: string): void {
    this.bindings = this.bindings.filter((binding) => midiTargetKey(binding.target) !== targetKey)
  }

  map(message: MidiMessage, context: MidiMapContext): DJCommand[] {
    const binding = this.bindings.find((entry) => midiSourceKey(entry.source) === midiSourceKey(message))
    if (!binding) {
      return []
    }
    return commandsFor(binding.target, message, context, binding.encoding)
  }
}

function commandsFor(
  target: MidiTarget,
  message: MidiMessage,
  context: MidiMapContext,
  encoding: MidiCcEncoding,
): DJCommand[] {
  switch (target.kind) {
    case 'play':
      return onPress(message, { type: 'DECK_TOGGLE_PLAY', deck: target.deck })
    case 'cue':
      if (message.pressed) {
        return [{ type: 'DECK_CUE', deck: target.deck }]
      }
      if (isRelease(message)) {
        return [{ type: 'DECK_CUE_RELEASE', deck: target.deck }]
      }
      return []
    case 'hotCue':
      if (message.pressed) {
        return [{ type: 'HOT_CUE', deck: target.deck, id: target.pad }]
      }
      if (isRelease(message)) {
        return [{ type: 'HOT_CUE_RELEASE', deck: target.deck, id: target.pad }]
      }
      return []
    case 'channelFader':
      return absolute(message, { type: 'SET_CHANNEL_FADER', deck: target.deck, value: ccToUnit(message.value) })
    case 'trim':
      return absolute(message, { type: 'SET_TRIM', deck: target.deck, value: ccToUnit(message.value) })
    case 'eq':
      return absolute(message, { type: 'SET_EQ', deck: target.deck, band: target.band, value: ccToUnit(message.value) })
    case 'tempo':
      return absolute(message, {
        type: 'SET_TEMPO',
        deck: target.deck,
        percent: ccToTempoPercent(message.value, context.tempoRange(target.deck)),
      })
    case 'color':
      return absolute(message, { type: 'SET_COLOR', deck: target.deck, value: ccToUnit(message.value) })
    case 'channelCue':
      return onPress(message, {
        type: 'SET_CHANNEL_CUE',
        deck: target.deck,
        enabled: !context.channelCue(target.deck),
      })
    case 'sync':
      return onPress(message, {
        type: 'SET_SYNC',
        deck: target.deck,
        enabled: !context.syncEnabled(target.deck),
      })
    case 'masterDeck':
      return onPress(message, { type: 'SET_MASTER_DECK', deck: target.deck })
    case 'quantize':
      return onPress(message, {
        type: 'SET_QUANTIZE',
        deck: target.deck,
        enabled: !context.quantizeEnabled(target.deck),
      })
    case 'slip':
      return onPress(message, {
        type: 'SET_SLIP',
        deck: target.deck,
        enabled: !context.slipEnabled(target.deck),
      })
    case 'vinyl':
      return onPress(message, {
        type: 'SET_VINYL',
        deck: target.deck,
        enabled: !context.vinylMode(target.deck),
      })
    case 'masterTempo':
      return onPress(message, {
        type: 'SET_MASTER_TEMPO',
        deck: target.deck,
        enabled: !context.masterTempo(target.deck),
      })
    case 'loopIn':
      return onPress(message, { type: 'LOOP_IN', deck: target.deck })
    case 'loopOut':
      return onPress(message, { type: 'LOOP_OUT', deck: target.deck })
    case 'reloop':
      return onPress(message, { type: 'LOOP_RELOOP', deck: target.deck })
    case 'loopHalve':
      return onPress(message, { type: 'LOOP_HALVE', deck: target.deck })
    case 'loopDouble':
      return onPress(message, { type: 'LOOP_DOUBLE', deck: target.deck })
    case 'beatJump':
      return onPress(message, { type: 'BEAT_JUMP', deck: target.deck, beats: target.beats })
    case 'jog': {
      if (message.kind !== 'cc') {
        return []
      }
      const ticks = encoding === 'relativeOffset64' ? relativeOffset64(message.value) : 0
      if (ticks === 0) {
        return []
      }
      return [{ type: 'JOG_TOUCH_MOVE', deck: target.deck, deltaRadians: ticks * MIDI_JOG_RADIANS_PER_TICK }]
    }
    case 'jogTouch':
      if (message.pressed) {
        return [{ type: 'JOG_TOUCH_START', deck: target.deck }]
      }
      if (isRelease(message)) {
        return [{ type: 'JOG_TOUCH_END', deck: target.deck }]
      }
      return []
    case 'pitchBend':
      if (message.pressed) {
        return [{ type: 'PITCH_BEND_START', deck: target.deck, direction: target.direction }]
      }
      if (isRelease(message)) {
        return [{ type: 'PITCH_BEND_END', deck: target.deck }]
      }
      return []
    case 'crossfader':
      return absolute(message, { type: 'SET_CROSSFADER', value: ccToUnit(message.value) })
    case 'masterGain':
      return absolute(message, { type: 'SET_MASTER_GAIN', value: ccToUnit(message.value) })
    case 'cueMix':
      return absolute(message, { type: 'SET_CUE_MIX', value: ccToUnit(message.value) })
    case 'phonesLevel':
      return absolute(message, { type: 'SET_PHONES_LEVEL', value: ccToUnit(message.value) })
    case 'beatFxLevel':
      return absolute(message, { type: 'SET_BEAT_FX_LEVEL', value: ccToUnit(message.value) })
    case 'beatFxEnabled':
      return onPress(message, { type: 'SET_BEAT_FX_ENABLED', enabled: !context.beatFxEnabled() })
    case 'record':
      return onPress(message, context.recording() ? { type: 'RECORD_STOP' } : { type: 'RECORD_START' })
    default: {
      const neverTarget: never = target
      return neverTarget
    }
  }
}

function onPress(message: MidiMessage, command: DJCommand): DJCommand[] {
  return message.pressed ? [command] : []
}

function isRelease(message: MidiMessage): boolean {
  return !message.pressed
}

function absolute(message: MidiMessage, command: DJCommand): DJCommand[] {
  if (message.kind !== 'cc') {
    return []
  }
  return [command]
}
