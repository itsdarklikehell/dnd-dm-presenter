import type { Location } from '~/types/location'

export const LOCATIONS_KEY = 'dm-presenter:locations'

export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<Location[]>([])

  function addLocation(image: string): void {
    locations.value = [...locations.value, { id: crypto.randomUUID(), image }]
  }

  function replaceLocationImage(id: string, image: string): void {
    const replaced = replacedImages(locations.value, id, image)

    locations.value = locations.value.map(entry => entry.id === id ? { ...entry, image } : entry)

    void releaseImages(replaced)
  }

  function removeLocation(id: string): void {
    const removed = locations.value.filter(entry => entry.id === id)

    locations.value = locations.value.filter(entry => entry.id !== id)

    void releaseImages(removed)
  }

  function reorderLocations(orderedIds: string[]): void {
    locations.value = reorderById(locations.value, orderedIds)
  }

  return { locations, addLocation, replaceLocationImage, removeLocation, reorderLocations }
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
