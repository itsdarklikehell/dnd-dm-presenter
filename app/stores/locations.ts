import type { Location } from '~/types/location'

const LOCATIONS_KEY = 'dm-presenter:locations'

export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<Location[]>([])

  function addLocation(image: string): void {
    locations.value = [...locations.value, { id: crypto.randomUUID(), image }]
  }

  function removeLocation(id: string): void {
    locations.value = locations.value.filter(entry => entry.id !== id)
  }

  function reorderLocations(orderedIds: string[]): void {
    locations.value = reorderById(locations.value, orderedIds)
  }

  return { locations, addLocation, removeLocation, reorderLocations }
}, {
  persist: { key: LOCATIONS_KEY, ...fieldPersistence('locations', isLocationArray, () => []) }
})

function isLocationArray(value: unknown): value is Location[] {
  return Array.isArray(value) && value.every(entry =>
    isRecord(entry)
    && typeof entry.id === 'string'
    && typeof entry.image === 'string'
  )
}
