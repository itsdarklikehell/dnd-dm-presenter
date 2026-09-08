import type { FogSelectionMode, LocationFogState, LocationView, Point, Rect, RevealArea } from '~/types/locationDisplay'

const LOCATION_DISPLAY_KEY = 'dm-presenter:location-display'

interface LocationDisplayState {
  activeLocationId: string | null
  fog: Record<string, LocationFogState>
  view: Record<string, LocationView>
  selectionMode: FogSelectionMode
}

const EMPTY_FOG_STATE: LocationFogState = { fogEnabled: false, revealedAreas: [] }
const DEFAULT_VIEW: LocationView = { scale: 1, offsetX: 0, offsetY: 0 }
const DEFAULT_SELECTION_MODE: FogSelectionMode = 'rect'

export const useLocationDisplayStore = defineStore('locationDisplay', () => {
  const activeLocationId = ref<string | null>(null)
  const fog = ref<Record<string, LocationFogState>>({})
  const view = ref<Record<string, LocationView>>({})
  const selectionMode = ref<FogSelectionMode>(DEFAULT_SELECTION_MODE)

  function isActive(id: string): boolean {
    return activeLocationId.value === id
  }

  function showLocation(id: string): void {
    activeLocationId.value = id
  }

  function hideLocation(): void {
    activeLocationId.value = null
  }

  function getFogState(id: string): LocationFogState {
    return fog.value[id] ?? EMPTY_FOG_STATE
  }

  function addFog(id: string): void {
    fog.value = { ...fog.value, [id]: { fogEnabled: true, revealedAreas: [] } }
  }

  function clearFog(id: string): void {
    fog.value = { ...fog.value, [id]: { ...getFogState(id), fogEnabled: false } }
  }

  function revealArea(id: string, area: RevealArea): void {
    const current = getFogState(id)
    fog.value = { ...fog.value, [id]: { fogEnabled: true, revealedAreas: [...current.revealedAreas, area] } }
  }

  function undoReveal(id: string): void {
    const current = getFogState(id)
    if (!current.revealedAreas.length) {
      return
    }

    fog.value = { ...fog.value, [id]: { ...current, revealedAreas: current.revealedAreas.slice(0, -1) } }
  }

  function getView(id: string): LocationView {
    return view.value[id] ?? DEFAULT_VIEW
  }

  function setView(id: string, next: LocationView): void {
    view.value = { ...view.value, [id]: next }
  }

  function setSelectionMode(next: FogSelectionMode): void {
    selectionMode.value = next
  }

  return {
    activeLocationId,
    fog,
    view,
    selectionMode,
    isActive,
    showLocation,
    hideLocation,
    getFogState,
    addFog,
    clearFog,
    revealArea,
    undoReveal,
    getView,
    setView,
    setSelectionMode
  }
}, {
  persist: {
    key: LOCATION_DISPLAY_KEY,
    serializer: {
      serialize: state => JSON.stringify({
        activeLocationId: state.activeLocationId,
        fog: state.fog,
        view: state.view,
        selectionMode: state.selectionMode
      }),
      deserialize: (raw) => {
        const parsed: unknown = JSON.parse(raw)
        if (!isStoredLocationDisplayState(parsed)) {
          return { activeLocationId: null, fog: {}, view: {}, selectionMode: DEFAULT_SELECTION_MODE }
        }

        return {
          activeLocationId: parsed.activeLocationId,
          fog: normalizeFogRecord(parsed.fog),
          view: parsed.view ?? {},
          selectionMode: isSelectionMode(parsed.selectionMode) ? parsed.selectionMode : DEFAULT_SELECTION_MODE
        }
      }
    }
  }
})

function isStoredLocationDisplayState(value: unknown): value is Pick<LocationDisplayState, 'activeLocationId'> & {
  fog: Record<string, unknown>
  view?: Record<string, LocationView>
  selectionMode?: unknown
} {
  return isRecord(value)
    && (value.activeLocationId === null || typeof value.activeLocationId === 'string')
    && isRecord(value.fog)
    && (value.view === undefined || (isRecord(value.view) && Object.values(value.view).every(isLocationView)))
}

function normalizeFogRecord(stored: Record<string, unknown>): Record<string, LocationFogState> {
  const fog: Record<string, LocationFogState> = {}

  for (const [id, value] of Object.entries(stored)) {
    const state = normalizeFogState(value)
    if (state) {
      fog[id] = state
    }
  }

  return fog
}

// Records written before free-form fog stored `revealedRects`; those become plain four-point areas.
function normalizeFogState(value: unknown): LocationFogState | null {
  if (!isRecord(value) || typeof value.fogEnabled !== 'boolean') {
    return null
  }

  if (Array.isArray(value.revealedAreas) && value.revealedAreas.every(isRevealArea)) {
    return { fogEnabled: value.fogEnabled, revealedAreas: value.revealedAreas }
  }

  if (Array.isArray(value.revealedRects) && value.revealedRects.every(isRect)) {
    return { fogEnabled: value.fogEnabled, revealedAreas: value.revealedRects.map(rectToArea) }
  }

  return { fogEnabled: value.fogEnabled, revealedAreas: [] }
}

function isSelectionMode(value: unknown): value is FogSelectionMode {
  return value === 'rect' || value === 'freeform'
}

function isLocationView(value: unknown): value is LocationView {
  return isRecord(value)
    && typeof value.scale === 'number'
    && typeof value.offsetX === 'number'
    && typeof value.offsetY === 'number'
}

function isRevealArea(value: unknown): value is RevealArea {
  return Array.isArray(value) && value.length >= 3 && value.every(isPoint)
}

function isPoint(value: unknown): value is Point {
  return isRecord(value)
    && typeof value.x === 'number'
    && typeof value.y === 'number'
}

function isRect(value: unknown): value is Rect {
  return isRecord(value)
    && typeof value.x === 'number'
    && typeof value.y === 'number'
    && typeof value.width === 'number'
    && typeof value.height === 'number'
}
