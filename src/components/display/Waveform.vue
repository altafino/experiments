<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  peaks?: Float32Array
  positionSeconds: number
  durationSeconds: number
}>()

const emit = defineEmits<{
  seek: [positionSeconds: number]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let resizeObserver: ResizeObserver | undefined

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
  ctx.fillStyle = '#0e1622'
  ctx.fillRect(0, 0, width, height)

  const peaks = props.peaks
  if (peaks && peaks.length > 0) {
    const mid = height / 2
    const barWidth = Math.max(1, width / peaks.length)
    ctx.fillStyle = '#4aa7c2'
    for (let i = 0; i < peaks.length; i += 1) {
      const amplitude = peaks[i] ?? 0
      const barHeight = Math.max(1, amplitude * (height - 8))
      ctx.fillRect((i / peaks.length) * width, mid - barHeight / 2, barWidth, barHeight)
    }
  }

  if (props.durationSeconds > 0) {
    const x = (props.positionSeconds / props.durationSeconds) * width
    ctx.fillStyle = '#f3b23e'
    ctx.fillRect(Math.floor(x), 0, 2, height)
  }
}

function onPointer(event: MouseEvent): void {
  if (props.durationSeconds <= 0) {
    return
  }
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }
  const rect = canvas.getBoundingClientRect()
  const ratio = (event.clientX - rect.left) / rect.width
  const next = Math.min(Math.max(ratio, 0), 1) * props.durationSeconds
  emit('seek', next)
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
  () => [props.peaks, props.positionSeconds, props.durationSeconds] as const,
  () => {
    draw()
  },
)
</script>

<template>
  <canvas
    ref="canvasRef"
    data-testid="waveform"
    class="h-28 w-full cursor-pointer rounded-md"
    role="slider"
    :aria-valuemin="0"
    :aria-valuemax="durationSeconds"
    :aria-valuenow="positionSeconds"
    aria-label="Waveform playhead"
    @click="onPointer"
  />
</template>
