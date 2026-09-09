import type { ComputedRef, Ref } from 'vue'
import type { CanvasSize } from '~/composables/useCanvasSurface'
import type { LocationView } from '~/types/locationDisplay'

const MAX_SCALE = 8
const ZOOM_SENSITIVITY = 0.0015

interface PanOrigin {
  clientX: number
  clientY: number
  offsetX: number
  offsetY: number
}

export interface CanvasViewport {
  panMode: Ref<boolean>
  canPan: ComputedRef<boolean>
  isPanning: ComputedRef<boolean>
  wrapperStyle: ComputedRef<Record<string, string>>
  beginPan: (event: PointerEvent) => void
  updatePan: (event: PointerEvent) => void
  endPan: () => void
}

interface CanvasViewportOptions {
  canvas: Ref<HTMLCanvasElement | null>
  displaySize: Ref<CanvasSize>
  view: () => LocationView
  interactive: () => boolean
  setView: (view: LocationView) => void
}

// Owns the pan/zoom transform applied to the canvas wrapper: wheel zooms around the pointer, holding space turns
// a drag into a pan. Nothing here knows about fog — it's the view transform for an image-sized canvas.
export function useCanvasViewport(options: CanvasViewportOptions): CanvasViewport {
  const panMode = ref(false)
  const panOrigin = ref<PanOrigin | null>(null)

  const canPan = computed(() => options.view().scale > 1)
  const isPanning = computed(() => panOrigin.value !== null)

  const wrapperStyle = computed(() => {
    const { scale, offsetX, offsetY } = options.view()
    const { width, height } = options.displaySize.value

    return {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${offsetX * width}px, ${offsetY * height}px) scale(${scale})`
    }
  })

  function beginPan(event: PointerEvent): void {
    if (!canPan.value) {
      return
    }

    options.canvas.value?.setPointerCapture(event.pointerId)
    panOrigin.value = {
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: options.view().offsetX,
      offsetY: options.view().offsetY
    }
  }

  function updatePan(event: PointerEvent): void {
    const origin = panOrigin.value
    if (!origin) {
      return
    }

    options.setView(clampView({
      scale: options.view().scale,
      offsetX: origin.offsetX + (event.clientX - origin.clientX) / options.displaySize.value.width,
      offsetY: origin.offsetY + (event.clientY - origin.clientY) / options.displaySize.value.height
    }))
  }

  function endPan(): void {
    panOrigin.value = null
  }

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
    const canvas = options.canvas.value
    if (!canvas) {
      return
    }

    event.preventDefault()

    const current = options.view()
    const bounds = canvas.getBoundingClientRect()
    const anchorX = (event.clientX - bounds.left) / bounds.width - 0.5
    const anchorY = (event.clientY - bounds.top) / bounds.height - 0.5
    const scale = Math.min(MAX_SCALE, Math.max(1, current.scale * Math.exp(-event.deltaY * ZOOM_SENSITIVITY)))

    options.setView(clampView({
      scale,
      offsetX: current.offsetX + anchorX * (current.scale - scale),
      offsetY: current.offsetY + anchorY * (current.scale - scale)
    }))
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (isTypingTarget(event) || event.code !== 'Space' || event.repeat) {
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

  onMounted(() => {
    if (!options.interactive()) {
      return
    }

    options.canvas.value?.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', stopPanMode)
  })

  onBeforeUnmount(() => {
    options.canvas.value?.removeEventListener('wheel', onWheel)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', stopPanMode)
  })

  return { panMode, canPan, isPanning, wrapperStyle, beginPan, updatePan, endPan }
}
