<script setup lang="ts">
import { ref } from 'vue'
import type { DeckId } from '../../commands/DJCommand'
import { wrapAngleDelta } from '../../domain/jog'
import { useCommandBus } from '../../io/keys'

const props = defineProps<{
  deckId: DeckId
  vinylMode: boolean
  jogVelocity: number
  empty: boolean
  loading: boolean
  error: string | null
  scratchDisabled: boolean
}>()

const emit = defineEmits<{
  loadRequest: []
  dropFile: [file: File]
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
  if (props.scratchDisabled) {
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
  if (!touching || props.scratchDisabled) {
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

function onDrop(event: DragEvent): void {
  const file = event.dataTransfer?.files[0]
  if (file) {
    emit('dropFile', file)
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-2" data-testid="jog-wheel">
    <button
      type="button"
      data-testid="vinyl"
      class="rounded-sm px-2 py-1 text-[10px] tracking-[0.12em] uppercase"
      :class="vinylMode ? 'bg-accent text-surface' : 'border border-panel-border text-muted'"
      :disabled="scratchDisabled"
      :aria-pressed="vinylMode"
      @click="toggleVinyl"
    >
      Vinyl
    </button>
    <div
      ref="platterRef"
      data-testid="jog"
      class="platter relative cursor-grab touch-none rounded-full border-4 bg-[#121a24] active:cursor-grabbing"
      :class="error ? 'border-cue' : 'border-panel-border'"
      role="slider"
      aria-label="Jog wheel"
      :aria-valuenow="jogVelocity"
      :aria-disabled="scratchDisabled"
      @pointerdown.prevent="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dragover.prevent
      @drop.prevent="onDrop"
    >
      <div
        class="pointer-events-none absolute inset-3 rounded-full border"
        :class="loading ? 'border-accent platter-loading' : error ? 'border-cue' : 'border-accent/40'"
      />
      <div class="pointer-events-none absolute inset-[42%] rounded-full bg-accent/80" />
      <div
        class="pointer-events-none absolute left-1/2 top-1 h-3 w-0.5 -translate-x-1/2 bg-cue"
        :class="Math.abs(jogVelocity) > 0.05 ? 'opacity-100' : 'opacity-60'"
      />
      <button
        v-if="empty || error"
        type="button"
        data-testid="platter-load"
        class="absolute inset-[18%] z-10 flex min-h-11 items-center justify-center rounded-full text-[11px] tracking-[0.2em] text-ink uppercase"
        :class="loading ? 'opacity-40' : 'bg-surface/80'"
        :disabled="loading"
        @click.stop="emit('loadRequest')"
        @pointerdown.stop
      >
        {{ loading ? '…' : 'LOAD' }}
      </button>
      <p
        v-if="error"
        data-testid="load-error"
        class="pointer-events-none absolute inset-x-2 bottom-3 z-10 truncate text-center text-[10px] text-cue"
      >
        {{ error }}
      </p>
      <div
        v-if="loading"
        data-testid="platter-loading"
        class="pointer-events-none absolute inset-0 rounded-full bg-surface/40"
      />
    </div>
  </div>
</template>
