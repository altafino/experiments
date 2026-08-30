<script setup lang="ts">
import type { DeckId } from '../../commands/DJCommand'
import { HOT_CUE_IDS, type HotCue, type HotCueId } from '../../domain/DeckState'
import { hotCueColor, hotCueTestId } from '../../domain/quantize'
import { formatTimecode } from '../../domain/timecode'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  hotCues: HotCue[]
  quantizeEnabled: boolean
  disabled: boolean
}>()

const commandBus = useCommandBus()

function cueAt(id: HotCueId): HotCue | undefined {
  return props.hotCues.find((cue) => cue.id === id)
}

function padTitle(id: HotCueId): string {
  const cue = cueAt(id)
  if (!cue) {
    return `Set hot cue ${id}`
  }
  return formatTimecode(cue.positionSeconds)
}

async function onPad(id: HotCueId, event: MouseEvent): Promise<void> {
  if (event.shiftKey) {
    await commandBus.dispatch({ type: 'CLEAR_HOT_CUE', deck: props.deckId, id })
    return
  }
  await commandBus.dispatch({ type: 'HOT_CUE', deck: props.deckId, id })
}

async function toggleQuantize(): Promise<void> {
  await commandBus.dispatch({
    type: 'SET_QUANTIZE',
    deck: props.deckId,
    enabled: !props.quantizeEnabled,
  })
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="id in HOT_CUE_IDS"
      :key="id"
      type="button"
      :data-testid="hotCueTestId(id)"
      :data-position="cueAt(id)?.positionSeconds.toFixed(2)"
      class="min-w-10 rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-40"
      :class="
        cueAt(id)
          ? 'text-surface'
          : 'border border-panel-border text-muted'
      "
      :style="cueAt(id) ? { backgroundColor: hotCueColor(id) } : undefined"
      :disabled="disabled"
      :aria-pressed="Boolean(cueAt(id))"
      :title="padTitle(id)"
      @click="onPad(id, $event)"
    >
      {{ id }}
    </button>
    <button
      type="button"
      data-testid="quantize"
      class="rounded-md px-3 py-2 text-[10px] tracking-wide uppercase"
      :class="
        quantizeEnabled ? 'bg-accent text-surface' : 'border border-panel-border text-muted'
      "
      :disabled="disabled"
      :aria-pressed="quantizeEnabled"
      @click="toggleQuantize"
    >
      Quantize
    </button>
  </div>
</template>
