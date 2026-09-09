import type { ComputedRef } from 'vue'
import type { CanvasSurface } from '~/composables/useCanvasSurface'
import type { FogSelectionMode, Point, Rect, RevealArea } from '~/types/locationDisplay'

// Screen-space distances; run through the surface's `toCanvasPx` before use.
const CLOSE_DISTANCE_PX = 18
const SAMPLE_DISTANCE_PX = 3
const LEFT_START_FACTOR = 1.5

const MIN_AREA_POINTS = 3
const MIN_REVEAL_SIZE = 0.0004
const MIN_RECT_SIDE = 0.01

// What the renderer needs to show for an in-progress selection, with the gesture already abstracted away: a
// polyline to stroke, and optionally the handle that closes it. Adding a gesture means producing one of these,
// not another branch in the renderer or the pointer handlers.
export interface SelectionPreview {
  points: Point[]
  closed: boolean
  closeHandle: Point | null
  closeHandleRadius: number
  closeHandleActive: boolean
}

export interface FogSelection {
  preview: ComputedRef<SelectionPreview | null>
  begin: (event: PointerEvent) => void
  track: (event: PointerEvent) => void
  finish: (event: PointerEvent) => void
  cancel: () => void
}

interface FogSelectionOptions {
  surface: CanvasSurface
  mode: () => FogSelectionMode
  interactive: () => boolean
  reveal: (area: RevealArea) => void
}

// Owns both reveal gestures behind one interface: dragging a square, and tracing a free-form loop that has to be
// released back on its own start point to count.
export function useFogSelection(options: FogSelectionOptions): FogSelection {
  const { toCanvasPx, canvasDistance, pointerToUnit } = options.surface

  const dragStart = ref<Point | null>(null)
  const dragCurrent = ref<Point | null>(null)
  const freeformPoints = ref<Point[]>([])
  const freeformLeftStart = ref(false)

  const preview = computed<SelectionPreview | null>(() => {
    if (options.mode() === 'freeform') {
      const start = freeformPoints.value[0]
      if (!start) {
        return null
      }

      return {
        points: freeformPoints.value,
        closed: false,
        closeHandle: start,
        closeHandleRadius: closeThreshold(),
        closeHandleActive: canClosePath()
      }
    }

    if (!dragStart.value || !dragCurrent.value) {
      return null
    }

    return {
      points: rectToArea(dragToRect(dragStart.value, dragCurrent.value)),
      closed: true,
      closeHandle: null,
      closeHandleRadius: 0,
      closeHandleActive: false
    }
  })

  function begin(event: PointerEvent): void {
    const point = pointerToUnit(event)

    if (options.mode() === 'freeform') {
      freeformPoints.value = [point]
      freeformLeftStart.value = false
      return
    }

    dragStart.value = point
    dragCurrent.value = point
  }

  function track(event: PointerEvent): void {
    if (options.mode() === 'freeform') {
      trackFreeform(event)
      return
    }

    if (dragStart.value) {
      dragCurrent.value = pointerToUnit(event)
    }
  }

  function finish(event: PointerEvent): void {
    const area = options.mode() === 'freeform' ? finishFreeform(event) : finishRect()
    cancel()

    if (area) {
      options.reveal(area)
    }
  }

  function cancel(): void {
    dragStart.value = null
    dragCurrent.value = null
    freeformPoints.value = []
    freeformLeftStart.value = false
  }

  function trackFreeform(event: PointerEvent): void {
    const points = freeformPoints.value
    const start = points[0]
    const last = points[points.length - 1]
    if (!start || !last) {
      return
    }

    const point = pointerToUnit(event)
    if (canvasDistance(last, point) < toCanvasPx(SAMPLE_DISTANCE_PX)) {
      return
    }

    freeformPoints.value = [...points, point]
    if (canvasDistance(start, point) > closeThreshold() * LEFT_START_FACTOR) {
      freeformLeftStart.value = true
    }
  }

  // Releasing anywhere but back on the start point discards the path rather than guessing how it closes.
  function finishFreeform(event: PointerEvent): RevealArea | null {
    const area = freeformPoints.value
    const confirmed = canClosePath(pointerToUnit(event)) && areaSize(area) > MIN_REVEAL_SIZE

    return confirmed ? area : null
  }

  function finishRect(): RevealArea | null {
    if (!dragStart.value || !dragCurrent.value) {
      return null
    }

    const rect = dragToRect(dragStart.value, dragCurrent.value)

    return rect.width > MIN_RECT_SIDE && rect.height > MIN_RECT_SIDE ? rectToArea(rect) : null
  }

  function closeThreshold(): number {
    return toCanvasPx(CLOSE_DISTANCE_PX)
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

  function dragToRect(start: Point, current: Point): Rect {
    return {
      x: Math.min(start.x, current.x),
      y: Math.min(start.y, current.y),
      width: Math.abs(current.x - start.x),
      height: Math.abs(current.y - start.y)
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (isTypingTarget(event) || event.key !== 'Escape' || !freeformPoints.value.length) {
      return
    }

    event.preventDefault()
    cancel()
  }

  // Switching gesture drops whatever was half-drawn; already revealed areas are untouched.
  watch(options.mode, cancel)

  onMounted(() => {
    if (!options.interactive()) {
      return
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', cancel)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('blur', cancel)
  })

  return { preview, begin, track, finish, cancel }
}
