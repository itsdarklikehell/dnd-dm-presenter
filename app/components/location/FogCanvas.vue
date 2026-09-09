<script setup lang="ts">
import type { FogSelectionMode, LocationView, Point, RevealArea } from '~/types/locationDisplay'

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

const STROKE_WIDTH_PX = 2
const DASH_PX = [6, 4]

const CLOSABLE_COLOR = '#4ade80'
const CLOSABLE_FILL = 'rgba(74, 222, 128, 0.35)'

const wrapperEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)

const surface = useCanvasSurface({
  canvas: canvasEl,
  container: () => wrapperEl.value?.parentElement,
  image: () => props.image,
  scale: () => props.view.scale,
  redraw: () => draw()
})

// `wrapperStyle` is pulled out so the template gets an auto-unwrapped ref rather than `viewport.wrapperStyle.value`.
const { wrapperStyle, ...viewport } = useCanvasViewport({
  canvas: canvasEl,
  displaySize: surface.displaySize,
  view: () => props.view,
  interactive: () => Boolean(props.interactive),
  setView: next => emit('update:view', next)
})

const selection = useFogSelection({
  surface,
  mode: () => props.selectionMode,
  interactive: () => Boolean(props.interactive),
  reveal: area => emit('reveal', area)
})

const cursorClass = computed(() => {
  if (!props.interactive) {
    return ''
  }

  if (viewport.panMode.value) {
    if (!viewport.canPan.value) {
      return 'cursor-not-allowed'
    }

    return viewport.isPanning.value ? 'cursor-grabbing' : 'cursor-grab'
  }

  return 'cursor-crosshair'
})

function onPointerDown(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (viewport.panMode.value) {
    viewport.beginPan(event)
    return
  }

  canvasEl.value?.setPointerCapture(event.pointerId)
  selection.begin(event)
}

function onPointerMove(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (viewport.isPanning.value) {
    viewport.updatePan(event)
    return
  }

  selection.track(event)
}

function onPointerUp(event: PointerEvent): void {
  if (!props.interactive) {
    return
  }

  if (viewport.isPanning.value) {
    viewport.endPan()
    return
  }

  selection.finish(event)
}

function onPointerCancel(): void {
  if (!props.interactive) {
    return
  }

  viewport.endPan()
  selection.cancel()
}

function draw(): void {
  const canvas = canvasEl.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) {
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (props.fogEnabled) {
    ctx.fillStyle = props.mode === 'true-fog' ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0, 0, 0, 1)'
    for (const area of props.revealedAreas) {
      tracePath(ctx, area, canvas)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  drawPreview(ctx, canvas)
}

// The preview is gesture-agnostic: a dashed polyline, plus the close handle a free-form loop is confirmed on.
function drawPreview(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  const preview = selection.preview.value
  if (!preview) {
    return
  }

  ctx.strokeStyle = 'white'
  ctx.lineWidth = surface.toCanvasPx(STROKE_WIDTH_PX)
  ctx.setLineDash(DASH_PX.map(dash => surface.toCanvasPx(dash)))

  tracePath(ctx, preview.points, canvas)
  if (preview.closed) {
    ctx.closePath()
  }
  ctx.stroke()
  ctx.setLineDash([])

  if (!preview.closeHandle) {
    return
  }

  ctx.beginPath()
  ctx.arc(preview.closeHandle.x * canvas.width, preview.closeHandle.y * canvas.height, preview.closeHandleRadius, 0, Math.PI * 2)
  ctx.strokeStyle = preview.closeHandleActive ? CLOSABLE_COLOR : 'white'
  ctx.stroke()

  if (preview.closeHandleActive) {
    ctx.fillStyle = CLOSABLE_FILL
    ctx.fill()
  }
}

function tracePath(ctx: CanvasRenderingContext2D, points: Point[], canvas: HTMLCanvasElement): void {
  ctx.beginPath()
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x * canvas.width, point.y * canvas.height)
    } else {
      ctx.lineTo(point.x * canvas.width, point.y * canvas.height)
    }
  })
}

watch(
  [() => props.fogEnabled, () => props.revealedAreas, () => props.mode, selection.preview],
  draw,
  { deep: true }
)
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
