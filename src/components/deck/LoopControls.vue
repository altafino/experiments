<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import type { Loop } from '../../domain/DeckState'
import {
  BEAT_LOOP_LENGTHS,
  beatLoopLabel,
  beatLoopTestId,
  type BeatLoopLength,
} from '../../domain/loop'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  loopInSeconds?: number
  activeLoop?: Loop
  disabled: boolean
}>()

const commandBus = useCommandBus()

async function loopIn(): Promise<void> {
  await commandBus.dispatch({ type: 'LOOP_IN', deck: props.deckId })
}

async function loopOut(): Promise<void> {
  await commandBus.dispatch({ type: 'LOOP_OUT', deck: props.deckId })
}

async function reloop(): Promise<void> {
  await commandBus.dispatch({ type: 'LOOP_RELOOP', deck: props.deckId })
}

async function beatLoop(beats: BeatLoopLength): Promise<void> {
  await commandBus.dispatch({ type: 'BEAT_LOOP', deck: props.deckId, beats })
}

async function halve(): Promise<void> {
  await commandBus.dispatch({ type: 'LOOP_HALVE', deck: props.deckId })
}

async function double(): Promise<void> {
  await commandBus.dispatch({ type: 'LOOP_DOUBLE', deck: props.deckId })
}

function beatActive(beats: BeatLoopLength): boolean {
  const loop = props.activeLoop
  return Boolean(loop?.active && loop.beats === beats)
}
</script>

<template>
  <div class="flex flex-col gap-2" data-testid="loop">
    <div class="flex flex-wrap gap-1">
      <button
        type="button"
        data-testid="loop-in"
        class="rounded px-2 py-1 text-[10px] tracking-wide uppercase"
        :class="
          loopInSeconds !== undefined
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :disabled="disabled"
        :aria-pressed="loopInSeconds !== undefined"
        @click="loopIn"
      >
        In
      </button>
      <button
        type="button"
        data-testid="loop-out"
        class="rounded px-2 py-1 text-[10px] tracking-wide uppercase"
        :class="
          activeLoop
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :disabled="disabled"
        :aria-pressed="Boolean(activeLoop)"
        @click="loopOut"
      >
        Out
      </button>
      <button
        type="button"
        data-testid="reloop"
        class="rounded px-2 py-1 text-[10px] tracking-wide uppercase"
        :class="
          activeLoop?.active
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :disabled="disabled || !activeLoop"
        :aria-pressed="Boolean(activeLoop?.active)"
        @click="reloop"
      >
        Reloop
      </button>
      <button
        type="button"
        data-testid="loop-halve"
        class="rounded px-2 py-1 text-[10px] tracking-wide uppercase border border-panel-border text-muted"
        :disabled="disabled || !activeLoop"
        @click="halve"
      >
        1/2
      </button>
      <button
        type="button"
        data-testid="loop-double"
        class="rounded px-2 py-1 text-[10px] tracking-wide uppercase border border-panel-border text-muted"
        :disabled="disabled || !activeLoop"
        @click="double"
      >
        ×2
      </button>
    </div>
    <div class="flex flex-wrap gap-1">
      <button
        v-for="beats in BEAT_LOOP_LENGTHS"
        :key="beats"
        type="button"
        :data-testid="beatLoopTestId(beats)"
        class="rounded px-1.5 py-0.5 text-[9px] tracking-wide"
        :class="
          beatActive(beats)
            ? 'bg-accent text-surface'
            : 'border border-panel-border text-muted'
        "
        :disabled="disabled"
        :aria-pressed="beatActive(beats)"
        @click="beatLoop(beats)"
      >
        {{ beatLoopLabel(beats) }}
      </button>
    </div>
  </div>
</template>
