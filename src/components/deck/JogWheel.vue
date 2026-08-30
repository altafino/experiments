<script setup lang="ts">
import { ref } from 'vue'
import type { DeckId } from '../../commands/DJCommand'
import { wrapAngleDelta } from '../../domain/jog'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  vinylMode: boolean
  jogVelocity: number
  disabled: boolean
}>()

const commandBus = useCommandBus()
const platterRef = ref<HTMLElement | null>(null)
let lastAngle = 0
let touching = false

function angleOf(event: PointerEvent): number {
  const platter = platterRef.value
  if (!platter) {
    return 0
  }
  const rect = platter.getBoundingClientRect()
  const x = event.clientX - (rect.left + rect.width / 2)
  const y = event.clientY - (rect.top + rect.height / 2)
  return Math.atan2(y, x)
}

async function toggleVinyl(): Promise<void> {
  await commandBus.dispatch({
    type: 'SET_VINYL',
    deck: props.deckId,
    enabled: !props.vinylMode,
  })
}

async function onPointerDown(event: PointerEvent): Promise<void> {
  if (props.disabled) {
    return
  }
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    target.setPointerCapture(event.pointerId)
  }
  touching = true
  lastAngle = angleOf(event)
  await commandBus.dispatch({ type: 'JOG_TOUCH_START', deck: props.deckId })
}

async function onPointerMove(event: PointerEvent): Promise<void> {
  if (!touching || props.disabled) {
    return
  }
  const next = angleOf(event)
  const delta = wrapAngleDelta(lastAngle, next)
  lastAngle = next
  if (delta === 0) {
    return
  }
  await commandBus.dispatch({ type: 'JOG_TOUCH_MOVE', deck: props.deckId, deltaRadians: delta })
}

async function onPointerUp(): Promise<void> {
  if (!touching) {
    return
  }
  touching = false
  await commandBus.dispatch({ type: 'JOG_TOUCH_END', deck: props.deckId })
}
</script>

<template>
  <div class="flex flex-col items-center gap-2" data-testid="jog-wheel">
    <button
      type="button"
      data-testid="vinyl"
      class="rounded px-2 py-1 text-[9px] tracking-wide uppercase"
      :class="vinylMode ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
      :disabled="disabled"
      :aria-pressed="vinylMode"
      @click="toggleVinyl"
    >
      Vinyl
    </button>
    <div
      ref="platterRef"
      data-testid="jog"
      class="relative h-28 w-28 cursor-grab touch-none rounded-full border-4 border-panel-border bg-[#121a24] active:cursor-grabbing"
      role="slider"
      aria-label="Jog wheel"
      :aria-valuenow="jogVelocity"
      :aria-disabled="disabled"
      @pointerdown.prevent="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="absolute inset-3 rounded-full border border-accent/40" />
      <div class="absolute inset-[42%] rounded-full bg-accent/80" />
      <div
        class="absolute left-1/2 top-1 h-3 w-0.5 -translate-x-1/2 bg-cue"
        :class="Math.abs(jogVelocity) > 0.05 ? 'opacity-100' : 'opacity-60'"
      />
    </div>
  </div>
</template>
