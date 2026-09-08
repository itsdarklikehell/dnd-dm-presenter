import type { LocationFogState, LocationView, Rect } from '~/types/fog'

const LOCATION_DISPLAY_KEY = 'dm-presenter:location-display'

interface LocationDisplayState {
  activeLocationId: string | null
  fog: Record<string, LocationFogState>
  view: Record<string, LocationView>
}

const EMPTY_FOG_STATE: LocationFogState = { fogEnabled: false, revealedRects: [] }
const DEFAULT_VIEW: LocationView = { scale: 1, offsetX: 0, offsetY: 0 }

export const useLocationDisplayStore = defineStore('locationDisplay', () => {
  const activeLocationId = ref<string | null>(null)
  const fog = ref<Record<string, LocationFogState>>({})
  const view = ref<Record<string, LocationView>>({})

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
    fog.value = { ...fog.value, [id]: { fogEnabled: true, revealedRects: [] } }
  }

  function clearFog(id: string): void {
    fog.value = { ...fog.value, [id]: { ...getFogState(id), fogEnabled: false } }
  }

  function revealRect(id: string, rect: Rect): void {
    const current = getFogState(id)
    fog.value = { ...fog.value, [id]: { fogEnabled: true, revealedRects: [...current.revealedRects, rect] } }
  }

  function getView(id: string): LocationView {
    return view.value[id] ?? DEFAULT_VIEW
  }

  function setView(id: string, next: LocationView): void {
    view.value = { ...view.value, [id]: next }
  }

  return {
    activeLocationId,
    fog,
    view,
    isActive,
    showLocation,
    hideLocation,
    getFogState,
    addFog,
    clearFog,
    revealRect,
    getView,
    setView
  }
}, {
  persist: {
    key: LOCATION_DISPLAY_KEY,
    serializer: {
      serialize: state => JSON.stringify({ activeLocationId: state.activeLocationId, fog: state.fog, view: state.view }),
      deserialize: (raw) => {
        const parsed: unknown = JSON.parse(raw)
        if (!isStoredLocationDisplayState(parsed)) {
          return { activeLocationId: null, fog: {}, view: {} }
        }

        return { activeLocationId: parsed.activeLocationId, fog: parsed.fog, view: parsed.view ?? {} }
      }
    }
  }
})

function isStoredLocationDisplayState(value: unknown): value is Omit<LocationDisplayState, 'view'> & { view?: Record<string, LocationView> } {
  return isRecord(value)
    && (value.activeLocationId === null || typeof value.activeLocationId === 'string')
    && isRecord(value.fog)
    && Object.values(value.fog).every(isLocationFogState)
    && (value.view === undefined || (isRecord(value.view) && Object.values(value.view).every(isLocationView)))
}

function isLocationFogState(value: unknown): value is LocationFogState {
  return isRecord(value)
    && typeof value.fogEnabled === 'boolean'
    && Array.isArray(value.revealedRects)
    && value.revealedRects.every(isRect)
}

function isLocationView(value: unknown): value is LocationView {
  return isRecord(value)
    && typeof value.scale === 'number'
    && typeof value.offsetX === 'number'
    && typeof value.offsetY === 'number'
}

function isRect(value: unknown): value is Rect {
  return isRecord(value)
    && typeof value.x === 'number'
    && typeof value.y === 'number'
    && typeof value.width === 'number'
    && typeof value.height === 'number'
}
