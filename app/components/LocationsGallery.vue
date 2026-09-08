<script setup lang="ts">
import type { GalleryImage } from '~/types/gallery'

const locationsStore = useLocationsStore()
const { locations } = storeToRefs(locationsStore)
const { addLocation, removeLocation, reorderLocations } = locationsStore

const locationDisplayStore = useLocationDisplayStore()
const { isActive: isLocationActive, showLocation, hideLocation } = locationDisplayStore

function toggleLocationDisplay(id: string): void {
  if (isLocationActive(id)) {
    hideLocation()
  } else {
    showLocation(id)
  }
}

const displayModeStore = useDisplayStore()
const { mode } = storeToRefs(displayModeStore)
const { setMode } = displayModeStore

const fileInput = ref<HTMLInputElement | null>(null)

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (file) {
    addLocation(await putImageBlob(await convertImageFileToWebpBlob(file, LOCATION_IMAGE_ENCODING)))
  }

  input.value = ''
}

const displayTarget = ref<GalleryImage | null>(null)
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Locations
        </h2>
        <UButton
          :color="mode === 'location' ? 'error' : 'neutral'"
          :variant="mode === 'location' ? 'solid' : 'subtle'"
          icon="i-lucide-monitor"
          size="xs"
          @click="setMode('location')"
        >
          Live presenting
        </UButton>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="subtle"
        @click="fileInput?.click()"
      >
        Add location
      </UButton>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      >
    </div>

    <GalleryGrid
      title="Locations"
      :images="locations"
      @remove="removeLocation"
      @reorder="reorderLocations"
    >
      <template #overlay="{ entry }">
        <USwitch
          :model-value="isLocationActive(entry.id)"
          :label="isLocationActive(entry.id) ? 'Shown' : 'Hidden'"
          :ui="{ label: 'w-14 text-white' }"
          size="sm"
          class="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-1"
          aria-label="Toggle whether this location is displayed"
          @update:model-value="toggleLocationDisplay(entry.id)"
        />

        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-cloud-fog"
          size="xs"
          class="absolute left-1 top-9"
          @click="displayTarget = entry"
        >
          Edit fog
        </UButton>
      </template>
    </GalleryGrid>

    <LocationDisplayModal
      :location="displayTarget"
      @close="displayTarget = null"
    />
  </section>
</template>
