import type { Ref } from 'vue'
import type { Point } from '~/types/locationDisplay'

// The backing store is rendered at devicePixelRatio × zoom, so strokes stay sharp while the element is
// scaled up by a CSS transform. Capped so an 8x zoom on a wide map doesn't allocate a canvas the GPU refuses.
const MAX_CANVAS_DIMENSION = 4096
const RESOLUTION_STEP = 0.25

export interface CanvasSize {
  width: number
  height: number
}

export interface CanvasSurface {
  displaySize: Ref<CanvasSize>
  toCanvasPx: (screenPx: number) => number
  canvasDistance: (a: Point, b: Point) => number
  pointerToUnit: (event: PointerEvent) => Point
}

interface CanvasSurfaceOptions {
  canvas: Ref<HTMLCanvasElement | null>
  container: () => HTMLElement | null | undefined
  image: () => string
  scale: () => number
  redraw: () => void
}

// Owns how large and how sharp the canvas is: it fits the image's aspect ratio into the container, sizes the
// backing store for the current zoom, and converts between screen, canvas and unit (0..1) coordinates.
export function useCanvasSurface(options: CanvasSurfaceOptions): CanvasSurface {
  const aspectRatio = ref(1)
  const displaySize = ref<CanvasSize>({ width: 0, height: 0 })
  const resolution = ref(1)

  // One backing pixel covers `scale / resolution` screen pixels, so a screen-space size divides back out.
  function toCanvasPx(screenPx: number): number {
    return screenPx * resolution.value / options.scale()
  }

  // Measured in canvas pixels, so a threshold stays visually constant whatever the map's aspect ratio.
  function canvasDistance(a: Point, b: Point): number {
    const canvas = options.canvas.value
    if (!canvas) {
      return Number.POSITIVE_INFINITY
    }

    return Math.hypot((a.x - b.x) * canvas.width, (a.y - b.y) * canvas.height)
  }

  function pointerToUnit(event: PointerEvent): Point {
    const canvas = options.canvas.value
    if (!canvas) {
      return { x: 0, y: 0 }
    }

    const bounds = canvas.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
    }
  }

  function fitToContainer(): void {
    const container = options.container()
    if (!container) {
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

    applyResolution()
  }

  // Deliberately separate from `fitToContainer`: the wrapper is sized to `displaySize`, so the container it's
  // measured against is also sized by it. Re-deriving `displaySize` on zoom would feed that loop once per wheel
  // tick and walk the canvas down to nothing. Zoom only ever changes how many device pixels back the same box.
  function applyResolution(): void {
    const canvas = options.canvas.value
    if (!canvas) {
      return
    }

    resolution.value = renderResolution()

    const width = Math.round(displaySize.value.width * resolution.value)
    const height = Math.round(displaySize.value.height * resolution.value)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }

    // Resizing the backing store wipes it, and strokes are sized off the zoom, so the redraw can't wait for a
    // watcher to flush.
    options.redraw()
  }

  // Enough device pixels to cover the current zoom, bounded by what a canvas can reasonably hold. Quantised so
  // a continuous wheel zoom re-allocates the backing store a handful of times rather than on every tick.
  function renderResolution(): number {
    const wanted = Math.ceil((window.devicePixelRatio || 1) * options.scale() / RESOLUTION_STEP) * RESOLUTION_STEP
    const longestSide = Math.max(displaySize.value.width, displaySize.value.height, 1)

    return Math.max(1, Math.min(wanted, MAX_CANVAS_DIMENSION / longestSide))
  }

  watch(options.image, (src) => {
    const img = new Image()
    img.onload = () => {
      aspectRatio.value = img.naturalWidth / img.naturalHeight || 1
      fitToContainer()
    }
    img.src = src
  }, { immediate: true })

  watch(options.scale, applyResolution)

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    resizeObserver = new ResizeObserver(fitToContainer)

    const container = options.container()
    if (container) {
      resizeObserver.observe(container)
    }

    fitToContainer()
  })

  onBeforeUnmount(() => resizeObserver?.disconnect())

  return { displaySize, toCanvasPx, canvasDistance, pointerToUnit }
}
