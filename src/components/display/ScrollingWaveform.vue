<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { HotCue, Loop } from '../../domain/DeckState'
import { hotCueColor } from '../../domain/quantize'
import type { BeatGrid, WaveformLevel } from '../../domain/Track'
import {
  beatTicksInWindow,
  bucketSeconds,
  peakBetween,
  selectPeakLevel,
  waveformWindow,
} from '../../domain/waveformView'
import type { DeckTheme } from './deckTheme'

const props = defineProps<{
  testId: string
  theme: DeckTheme
  peaks?: Float32Array
  levels?: WaveformLevel[]
  beatGrid?: BeatGrid
  positionSeconds: number
  durationSeconds: number
  windowSeconds: number
  cuePoint?: number
  hotCues?: HotCue[]
  activeLoop?: Loop
  logicalPositionSeconds?: number
}>()

const emit = defineEmits<{
  seek: [positionSeconds: number]
  zoom: [direction: 'in' | 'out']
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | undefined
let scrubOriginX = 0
let scrubOriginSeconds = 0
let scrubbing = false

function marker(ctx: CanvasRenderingContext2D, x: number, height: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), 0, 2, height)
}

function draw(): void {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (width === 0 || height === 0) {
    return
  }

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.floor(width * dpr)
  const pixelHeight = Math.floor(height * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#080d15'
  ctx.fillRect(0, 0, width, height)

  const view = waveformWindow(props.positionSeconds, props.windowSeconds, width)
  const xOf = (seconds: number): number => (seconds - view.startSeconds) / view.secondsPerPixel

  if (props.durationSeconds > 0) {
    const trackStart = Math.max(0, xOf(0))
    const trackEnd = Math.min(width, xOf(props.durationSeconds))
    ctx.fillStyle = '#0e1622'
    ctx.fillRect(trackStart, 0, Math.max(0, trackEnd - trackStart), height)
  }

  const loop = props.activeLoop
  if (loop) {
    const startX = xOf(loop.startSeconds)
    const endX = xOf(loop.endSeconds)
    ctx.fillStyle = loop.active ? 'rgba(126, 224, 255, 0.16)' : 'rgba(139, 152, 173, 0.1)'
    ctx.fillRect(startX, 0, Math.max(1, endX - startX), height)
  }

  for (const tick of beatTicksInWindow(props.beatGrid, view.startSeconds, view.endSeconds)) {
    const x = Math.round(xOf(tick.seconds))
    ctx.fillStyle = tick.downbeat ? 'rgba(232, 238, 248, 0.42)' : 'rgba(139, 152, 173, 0.2)'
    ctx.fillRect(x, tick.downbeat ? 0 : height * 0.14, 1, tick.downbeat ? height : height * 0.72)
  }

  const level = selectPeakLevel(props.levels, props.durationSeconds, view.secondsPerPixel)
  const peaks = level?.peaks ?? props.peaks
  const centerX = Math.round(width / 2)

  if (peaks && peaks.length > 0) {
    const bucket = bucketSeconds(peaks.length, props.durationSeconds)
    const mid = height / 2
    const maxHeight = height - 6

    for (const half of ['past', 'future'] as const) {
      const from = half === 'past' ? 0 : centerX
      const to = half === 'past' ? centerX : width
      ctx.fillStyle = half === 'past' ? props.theme.wavePast : props.theme.wave
      ctx.beginPath()
      for (let x = from; x < to; x += 1) {
        const start = view.startSeconds + x * view.secondsPerPixel
        const amplitude = peakBetween(peaks, bucket, start, start + view.secondsPerPixel)
        if (amplitude <= 0) {
          continue
        }
        const barHeight = Math.max(1.5, amplitude * maxHeight)
        ctx.rect(x, mid - barHeight / 2, 1, barHeight)
      }
      ctx.fill()
    }
  }

  if (props.cuePoint !== undefined) {
    marker(ctx, xOf(props.cuePoint), height, '#f3b23e')
  }
  for (const cue of props.hotCues ?? []) {
    marker(ctx, xOf(cue.positionSeconds), height, hotCueColor(cue.id))
  }
  if (loop) {
    const edge = loop.active ? '#7ee0ff' : '#8b98ad'
    marker(ctx, xOf(loop.startSeconds), height, edge)
    marker(ctx, xOf(loop.endSeconds), height, edge)
  }
  if (props.logicalPositionSeconds !== undefined) {
    marker(ctx, xOf(props.logicalPositionSeconds), height, '#d4a5ff')
  }

  ctx.fillStyle = '#f3f7ff'
  ctx.fillRect(centerX - 1, 0, 2, height)
  ctx.beginPath()
  ctx.moveTo(centerX - 5, 0)
  ctx.lineTo(centerX + 5, 0)
  ctx.lineTo(centerX, 6)
  ctx.closePath()
  ctx.fill()
}

function seekTo(seconds: number): void {
  emit('seek', Math.min(Math.max(seconds, 0), props.durationSeconds))
}

function onPointerDown(event: PointerEvent): void {
  if (props.durationSeconds <= 0) {
    return
  }
  scrubbing = true
  scrubOriginX = event.clientX
  scrubOriginSeconds = props.positionSeconds
  ;(event.target as Element).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!scrubbing) {
    return
  }
  const canvas = canvasRef.value
  if (!canvas || canvas.clientWidth === 0) {
    return
  }
  const secondsPerPixel = props.windowSeconds / canvas.clientWidth
  seekTo(scrubOriginSeconds - (event.clientX - scrubOriginX) * secondsPerPixel)
}

function onPointerUp(event: PointerEvent): void {
  if (!scrubbing) {
    return
  }
  scrubbing = false
  ;(event.target as Element).releasePointerCapture(event.pointerId)
}

function onWheel(event: WheelEvent): void {
  emit('zoom', event.deltaY < 0 ? 'in' : 'out')
}

onMounted(() => {
  draw()
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => {
      draw()
    })
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch(
  () =>
    [
      props.peaks,
      props.levels,
      props.beatGrid,
      props.positionSeconds,
      props.durationSeconds,
      props.windowSeconds,
      props.cuePoint,
      (props.hotCues ?? []).map((cue) => `${cue.id}:${cue.positionSeconds}`).join(','),
      props.activeLoop
        ? `${props.activeLoop.startSeconds}:${props.activeLoop.endSeconds}:${props.activeLoop.active}`
        : '',
      props.logicalPositionSeconds,
    ] as const,
  () => {
    draw()
  },
)
</script>

<template>
  <div class="relative">
    <canvas
      ref="canvasRef"
      :data-testid="testId"
      class="h-24 w-full cursor-ew-resize touch-none rounded-md select-none sm:h-28"
      role="slider"
      :aria-valuemin="0"
      :aria-valuemax="durationSeconds"
      :aria-valuenow="positionSeconds"
      aria-label="Scrolling waveform"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @wheel.prevent="onWheel"
    />
    <p
      v-if="durationSeconds <= 0"
      class="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.2em] text-muted uppercase"
    >
      No track loaded
    </p>
  </div>
</template>
