<script setup lang="ts">
import type { LocationView, Rect } from '~/types/fog'

const props = defineProps<{
  image: string
  revealedRects: Rect[]
  fogEnabled: boolean
  view: LocationView
  mode: 'dm-preview' | 'true-fog'
  interactive?: boolean
}>()

const emit = defineEmits<{
  'reveal': [rect: Rect]
  'update:view': [view: LocationView]
}>()

const MAX_SCALE = 8
const ZOOM_SENSITIVITY = 0.0015

const wrapperEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const aspectRatio = ref(1)
const displaySize = ref({ width: 0, height: 0 })
const dragStart = ref<{ x: number, y: number } | null>(null)
const dragCurrent = ref<{ x: number, y: number } | null>(null)
const panMode = ref(false)
const panOrigin = ref<{ clientX: number, clientY: number, offsetX: number, offsetY: number } | null>(null)

const canPan = computed(() => props.view.scale > 1)

const wrapperStyle = computed(() => ({
  width: `${displaySize.value.width}px`,
  height: `${displaySize.value.height}px`,
  transform: `translate(${props.view.offsetX * displaySize.value.width}px, ${props.view.offsetY * displaySize.value.height}px) scale(${props.view.scale})`
}))

const cursorClass = computed(() => {
  if (!props.interactive) {
    return ''
  }

  if (panMode.value) {
    if (!canPan.value) {
      return 'cursor-not-allowed'
    }

    return panOrigin.value ? 'cursor-grabbing' : 'cursor-grab'
  }

  return 'cursor-crosshair'
})

watch(() => props.image, (src) => {
  const img = new Image()
  img.onload = () => {
    aspectRatio.value = img.naturalWidth / img.naturalHeight || 1
    resizeCanvas()
  }
  img.src = src
}, { immediate: true })

function draw(): void {
  const canvas = canvasEl.value
  if (!canvas) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (props.fogEnabled) {
    ctx.fillStyle = props.mode === 'true-fog' ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    for (const rect of props.revealedRects) {
      ctx.fillRect(rect.x * canvas.width, rect.y * canvas.height, rect.width * canvas.width, rect.height * canvas.height)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  if (dragStart.value && dragCurrent.value) {
    const rect = dragToRect(dragStart.value, dragCurrent.value)
    ctx.strokeStyle = 'white'
    ctx.setLineDash([6, 4])
    ctx.lineWidth = 2 / props.view.scale
    ctx.strokeRect(rect.x * canvas.width, rect.y * canvas.height, rect.width * canvas.width, rect.height * canvas.height)
    ctx.setLineDash([])
  }
}

function resizeCanvas(): void {
  const canvas = canvasEl.value
  const container = wrapperEl.value?.parentElement
  if (!canvas || !container) {
    return
  }

  const containerWidth = container.clientWidth
  const containerHeight = container.clientHeight
  if (!containerWidth || !containerHeight) {
    return
  }

  const containerRatio = containerWidth / containerHeight
  displaySize.value = aspectRatio.value > containerRatio
    ? { width: containerWidth, height: containerWidth / aspectRatio.value }
    : { width: containerHeight * aspectRatio.value, height: containerHeight }

  canvas.width = displaySize.value.width
  canvas.height = displaySize.value.height
  draw()
}

watch([() => props.fogEnabled, () => props.revealedRects, () => props.mode], draw, { deep: true })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  resizeObserver = new ResizeObserver(resizeCanvas)
  if (wrapperEl.value?.parentElement) {
    resizeObserver.observe(wrapperEl.value.parentElement)
  }
  resizeCanvas()

  if (!props.interactive) {
    return
  }

  canvasEl.value?.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', stopPanMode)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvasEl.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', stopPanMode)
})

function clampView(view: LocationView): LocationView {
  const scale = Math.min(MAX_SCALE, Math.max(1, view.scale))
  const limit = (scale - 1) / 2

  return {
    scale,
    offsetX: Math.min(limit, Math.max(-limit, view.offsetX)),
    offsetY: Math.min(limit, Math.max(-limit, view.offsetY))
  }
}

function onWheel(event: WheelEvent): void {
  const canvas = canvasEl.value
  if (!canvas) {
    return
  }

  event.preventDefault()

  const bounds = canvas.getBoundingClientRect()
  const anchorX = (event.clientX - bounds.left) / bounds.width - 0.5
  const anchorY = (event.clientY - bounds.top) / bounds.height - 0.5
  const scale = Math.min(MAX_SCALE, Math.max(1, props.view.scale * Math.exp(-event.deltaY * ZOOM_SENSITIVITY)))

  emit('update:view', clampView({
    scale,
    offsetX: props.view.offsetX + anchorX * (props.view.scale - scale),
    offsetY: props.view.offsetY + anchorY * (props.view.scale - scale)
  }))
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.code !== 'Space' || event.repeat) {
    return
  }

  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) {
    return
  }

  event.preventDefault()
  panMode.value = true
}

function onKeyUp(event: KeyboardEvent): void {
  if (event.code === 'Space') {
    stopPanMode()
  }
}

function stopPanMode(): void {
  panMode.value = false
  panOrigin.value = null
}

function pointerToUnit(event: PointerEvent): { x: number, y: number } {
  const canvas = canvasEl.value
  if (!canvas) {
    return { x: 0, y: 0 }
  }

  const bounds = canvas.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
    y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
  }
}

function dragToRect(start: { x: number, y: number }, current: { x: number, y: number }): Rect {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y)
  }
}

function onPointerDown(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (panMode.value) {
    if (!canPan.value) {
      return
    }

    canvasEl.value?.setPointerCapture(event.pointerId)
    panOrigin.value = { clientX: event.clientX, clientY: event.clientY, offsetX: props.view.offsetX, offsetY: props.view.offsetY }
    return
  }

  canvasEl.value?.setPointerCapture(event.pointerId)
  dragStart.value = pointerToUnit(event)
  dragCurrent.value = dragStart.value
}

function onPointerMove(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (panOrigin.value) {
    emit('update:view', clampView({
      scale: props.view.scale,
      offsetX: panOrigin.value.offsetX + (event.clientX - panOrigin.value.clientX) / displaySize.value.width,
      offsetY: panOrigin.value.offsetY + (event.clientY - panOrigin.value.clientY) / displaySize.value.height
    }))
    return
  }

  if (!dragStart.value) {
    return
  }

  dragCurrent.value = pointerToUnit(event)
  draw()
}

function onPointerUp(): void {
  if (!props.interactive) {
    return
  }

  if (panOrigin.value) {
    panOrigin.value = null
    return
  }

  if (!dragStart.value || !dragCurrent.value) {
    return
  }

  const rect = dragToRect(dragStart.value, dragCurrent.value)
  dragStart.value = null
  dragCurrent.value = null
  draw()

  if (rect.width > 0.01 && rect.height > 0.01) {
    emit('reveal', rect)
  }
}
</script>

<template>
  <div
    ref="wrapperEl"
    class="relative"
    :style="wrapperStyle"
  >
    <img
      :src="image"
      alt=""
      class="block h-full w-full select-none object-contain"
    >
    <canvas
      ref="canvasEl"
      class="absolute inset-0 h-full w-full"
      :class="cursorClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    />
  </div>
</template>
