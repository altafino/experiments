<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  midiTargetCatalog,
  midiTargetKey,
  midiTargetLabel,
  type MidiStatus,
} from '../../domain/midi'
import { useCommandBus } from '../../io/keys'
import { useMidiStore } from '../../state/midi.store'

const commandBus = useCommandBus()
const midiStore = useMidiStore()
const { midi } = storeToRefs(midiStore)
const actionId = ref(midiTargetKey({ kind: 'play', deck: 1 }))
const targets = midiTargetCatalog()

async function connect(): Promise<void> {
  await commandBus.dispatch({ type: 'MIDI_CONNECT' })
}

function disconnect(): void {
  void commandBus.dispatch({ type: 'MIDI_DISCONNECT' })
}

async function learn(): Promise<void> {
  await commandBus.dispatch({ type: 'MIDI_LEARN', actionId: actionId.value })
}

async function cancelLearn(): Promise<void> {
  await commandBus.dispatch({ type: 'MIDI_LEARN', actionId: null })
}

async function unmap(): Promise<void> {
  await commandBus.dispatch({ type: 'MIDI_UNMAP', actionId: actionId.value })
}

async function resetMap(): Promise<void> {
  await commandBus.dispatch({ type: 'MIDI_RESET_MAP' })
}

function statusLabel(status: MidiStatus): string {
  switch (status) {
    case 'idle':
      return 'Off'
    case 'connecting':
      return 'Connecting'
    case 'open':
      return 'Open'
    case 'denied':
      return 'Denied'
    case 'unsupported':
      return 'Unsupported'
    case 'error':
      return 'Error'
    default: {
      const neverStatus: never = status
      return neverStatus
    }
  }
}
</script>

<template>
  <section
    data-testid="midi"
    class="rounded-xl border border-panel-border bg-panel p-5 shadow-xl"
  >
    <header class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xs tracking-[0.2em] text-muted uppercase">MIDI</h2>
      <div class="flex items-center gap-2">
        <p class="font-mono text-[10px] text-muted" data-testid="midi-status">
          {{ statusLabel(midi.status) }}
          <span v-if="midi.devices.length"> · {{ midi.devices.map((d) => d.name).join(', ') }}</span>
        </p>
        <button
          v-if="midi.status !== 'open' && midi.status !== 'connecting'"
          type="button"
          data-testid="midi-connect"
          class="rounded-md border border-panel-border px-3 py-1.5 text-xs"
          @click="connect"
        >
          Enable
        </button>
        <button
          v-else
          type="button"
          data-testid="midi-disconnect"
          class="rounded-md border border-panel-border px-3 py-1.5 text-xs"
          @click="disconnect"
        >
          Disable
        </button>
      </div>
    </header>

    <p data-testid="midi-devices" class="sr-only">
      {{ midi.devices.map((device) => device.name).join(', ') }}
    </p>
    <p class="mb-3 font-mono text-[11px] text-muted" data-testid="midi-last">
      {{ midi.learnActionId ? 'Listening… send a note or CC' : midi.lastMessage ?? 'No message yet' }}
    </p>

    <div class="flex flex-wrap items-end gap-2">
      <label class="flex min-w-[12rem] flex-1 flex-col gap-1 text-[10px] tracking-wider text-muted uppercase">
        Control
        <select
          v-model="actionId"
          data-testid="midi-learn-target"
          class="rounded-md border border-panel-border bg-surface px-2 py-1 text-sm text-ink normal-case"
        >
          <option v-for="target in targets" :key="midiTargetKey(target)" :value="midiTargetKey(target)">
            {{ midiTargetLabel(target) }}
          </option>
        </select>
      </label>
      <button
        v-if="midi.learnActionId"
        type="button"
        data-testid="midi-learn"
        class="rounded-md bg-accent px-3 py-1.5 text-xs text-surface"
        @click="cancelLearn"
      >
        Cancel
      </button>
      <button
        v-else
        type="button"
        data-testid="midi-learn"
        class="rounded-md border border-panel-border px-3 py-1.5 text-xs"
        @click="learn"
      >
        Learn
      </button>
      <button
        type="button"
        data-testid="midi-unmap"
        class="rounded-md border border-panel-border px-3 py-1.5 text-xs"
        @click="unmap"
      >
        Unmap
      </button>
      <button
        type="button"
        data-testid="midi-reset"
        class="rounded-md border border-panel-border px-3 py-1.5 text-xs"
        @click="resetMap"
      >
        Generic map
      </button>
    </div>
  </section>
</template>
