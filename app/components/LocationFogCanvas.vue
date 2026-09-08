<script setup lang="ts">
import type { FogSelectionMode, LocationView, Point, Rect, RevealArea } from '~/types/locationDisplay'

// `image` is a resolved, renderable src — the parent resolves the stored image reference.
const props = withDefaults(defineProps<{
  image: string
  revealedAreas: RevealArea[]
  fogEnabled: boolean
  view: LocationView
  mode: 'dm-preview' | 'true-fog'
  interactive?: boolean
  selectionMode?: FogSelectionMode
}>(), {
  selectionMode: 'rect'
})

const emit = defineEmits<{
  'reveal': [area: RevealArea]
  'update:view': [view: LocationView]
}>()

const MAX_SCALE = 8
const ZOOM_SENSITIVITY = 0.0015

// Screen-space distances; divided by `view.scale` before use, since the canvas is scaled by the view transform.
const CLOSE_DISTANCE_PX = 18
const SAMPLE_DISTANCE_PX = 3
const LEFT_START_FACTOR = 1.5

const MIN_AREA_POINTS = 3
const MIN_REVEAL_SIZE = 0.0004

const CLOSABLE_COLOR = '#4ade80'

const wrapperEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const aspectRatio = ref(1)
const displaySize = ref({ width: 0, height: 0 })
const dragStart = ref<Point | null>(null)
const dragCurrent = ref<Point | null>(null)
const freeformPoints = ref<Point[]>([])
const freeformLeftStart = ref(false)
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

// Switching gesture drops whatever was half-drawn; already revealed areas are untouched.
watch(() => props.selectionMode, cancelDrag)

function tracePath(ctx: CanvasRenderingContext2D, points: Point[], width: number, height: number): void {
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x * width, point.y * height)
    } else {
      ctx.lineTo(point.x * width, point.y * height)
    }
  })
}

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
    for (const area of props.revealedAreas) {
      tracePath(ctx, area, canvas.width, canvas.height)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  drawPendingSelection(ctx, canvas)
}

function drawPendingSelection(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const lineWidth = 2 / props.view.scale

  ctx.strokeStyle = 'white'
  ctx.lineWidth = lineWidth
  ctx.setLineDash([6, 4])

  if (props.selectionMode === 'freeform') {
    const start = freeformPoints.value[0]
    if (!start) {
      ctx.setLineDash([])
      return
    }

    tracePath(ctx, freeformPoints.value, canvas.width, canvas.height)
    ctx.stroke()
    ctx.setLineDash([])

    // The starting point doubles as the confirm target: bring the drag back onto it and release.
    const closable = canClosePath()
    ctx.beginPath()
    ctx.arc(start.x * canvas.width, start.y * canvas.height, closeThreshold(), 0, Math.PI * 2)
    ctx.strokeStyle = closable ? CLOSABLE_COLOR : 'white'
    ctx.stroke()

    if (closable) {
      ctx.fillStyle = 'rgba(74, 222, 128, 0.35)'
      ctx.fill()
    }

    return
  }

  if (dragStart.value && dragCurrent.value) {
    const rect = dragToRect(dragStart.value, dragCurrent.value)
    ctx.strokeRect(rect.x * canvas.width, rect.y * canvas.height, rect.width * canvas.width, rect.height * canvas.height)
  }

  ctx.setLineDash([])
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

watch([() => props.fogEnabled, () => props.revealedAreas, () => props.mode], draw, { deep: true })

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
  window.addEventListener('blur', onWindowBlur)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  canvasEl.value?.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
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
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) {
    return
  }

  if (event.key === 'Escape' && freeformPoints.value.length) {
    event.preventDefault()
    cancelDrag()
    return
  }

  if (event.code !== 'Space' || event.repeat) {
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

function onWindowBlur(): void {
  stopPanMode()
  cancelDrag()
}

function cancelDrag(): void {
  dragStart.value = null
  dragCurrent.value = null
  freeformPoints.value = []
  freeformLeftStart.value = false
  draw()
}

function pointerToUnit(event: PointerEvent): Point {
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

function dragToRect(start: Point, current: Point): Rect {
  return {
    x: Math.min(start.x, current.x),
    y: Math.min(start.y, current.y),
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y)
  }
}

// Measured in canvas pixels, so a threshold stays visually constant whatever the map's aspect ratio.
function canvasDistance(a: Point, b: Point): number {
  const canvas = canvasEl.value
  if (!canvas) {
    return Number.POSITIVE_INFINITY
  }

  return Math.hypot((a.x - b.x) * canvas.width, (a.y - b.y) * canvas.height)
}

function closeThreshold(): number {
  return CLOSE_DISTANCE_PX / props.view.scale
}

// A free-form area only counts as closed once the drag has left the starting point and come back onto it.
// `at` defaults to the last sampled point, which is what the live highlight follows; on release the actual
// release position is passed instead, since sampling can trail the pointer by a few pixels.
function canClosePath(at?: Point): boolean {
  const points = freeformPoints.value
  const start = points[0]
  const end = at ?? points[points.length - 1]
  if (!start || !end || points.length < MIN_AREA_POINTS || !freeformLeftStart.value) {
    return false
  }

  return canvasDistance(start, end) <= closeThreshold()
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
  const point = pointerToUnit(event)

  if (props.selectionMode === 'freeform') {
    freeformPoints.value = [point]
    freeformLeftStart.value = false
    draw()
    return
  }

  dragStart.value = point
  dragCurrent.value = point
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

  if (props.selectionMode === 'freeform') {
    trackFreeform(event)
    return
  }

  if (!dragStart.value) {
    return
  }

  dragCurrent.value = pointerToUnit(event)
  draw()
}

function trackFreeform(event: PointerEvent): void {
  const points = freeformPoints.value
  const start = points[0]
  const last = points[points.length - 1]
  if (!start || !last) {
    return
  }

  const point = pointerToUnit(event)
  if (canvasDistance(last, point) < SAMPLE_DISTANCE_PX / props.view.scale) {
    return
  }

  freeformPoints.value = [...points, point]
  if (canvasDistance(start, point) > closeThreshold() * LEFT_START_FACTOR) {
    freeformLeftStart.value = true
  }

  draw()
}

function onPointerUp(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (panOrigin.value) {
    panOrigin.value = null
    return
  }

  if (props.selectionMode === 'freeform') {
    // Releasing anywhere but back on the start point discards the path rather than guessing how it closes.
    const area = freeformPoints.value
    const confirmed = canClosePath(pointerToUnit(event)) && areaSize(area) > MIN_REVEAL_SIZE
    cancelDrag()

    if (confirmed) {
      emit('reveal', area)
    }

    return
  }

  if (!dragStart.value || !dragCurrent.value) {
    return
  }

  const rect = dragToRect(dragStart.value, dragCurrent.value)
  cancelDrag()

  if (rect.width > 0.01 && rect.height > 0.01) {
    emit('reveal', rectToArea(rect))
  }
}

function onPointerCancel(): void {
  if (!props.interactive) {
    return
  }

  panOrigin.value = null
  cancelDrag()
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
      class="absolute inset-0 h-full w-full touch-none"
      :class="cursorClass"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    />
  </div>
</template>
