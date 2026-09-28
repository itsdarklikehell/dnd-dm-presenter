<script setup lang="ts">
import type { Location } from '~/types/location'
import type { FogSelectionMode, LocationView, RevealArea } from '~/types/locationDisplay'

const props = defineProps<{ location: Location | null }>()

const emit = defineEmits<{
  close: []
}>()

const locationDisplayStore = useLocationDisplayStore()
const { selectionMode } = storeToRefs(locationDisplayStore)
const { isActive, showLocation, hideLocation, getFogState, getView, setView, addFog, clearFog, revealArea, undoReveal, setSelectionMode } = locationDisplayStore

const { removeLocation } = useLocationsStore()

const confirmingDelete = ref(false)

const stageEl = ref<HTMLElement | null>(null)

const fogState = computed(() => props.location ? getFogState(props.location.id) : { fogEnabled: false, revealedAreas: [] })
const imageSource = useImageSource(() => props.location?.image ?? '')

const view = computed(() => props.location ? getView(props.location.id) : { scale: 1, offsetX: 0, offsetY: 0 })

const selectionHint = computed(() => selectionMode.value === 'freeform'
  ? 'Draw a loop and release on the start dot to reveal it'
  : 'Drag a square to reveal it')

function focusStage(): void {
  stageEl.value?.focus()
}

watch(() => props.location, async (location) => {
  confirmingDelete.value = false

  if (!location) {
    return
  }

  await nextTick()
  focusStage()
})

function onAddFog(id: string): void {
  addFog(id)
  focusStage()
}

function onClearFog(id: string): void {
  clearFog(id)
  focusStage()
}

function onSelectionMode(mode: FogSelectionMode): void {
  setSelectionMode(mode)
  focusStage()
}

function onUndo(id: string): void {
  undoReveal(id)
  focusStage()
}

function onReveal(area: RevealArea): void {
  if (props.location) {
    revealArea(props.location.id, area)
  }
}

function onDelete(): void {
  if (props.location) {
    removeLocation(props.location.id)
  }

  emit('close')
}

function onToggleDisplay(id: string): void {
  if (isActive(id)) {
    hideLocation()
  } else {
    showLocation(id)
  }

  focusStage()
}

function onViewChange(next: LocationView): void {
  if (props.location) {
    setView(props.location.id, next)
  }
}
</script>

<template>
  <UModal
    :open="location !== null"
    title="Display location"
    :ui="{ content: 'sm:max-w-3xl' }"
    @update:open="value => { if (!value) emit('close') }"
    @after:enter="focusStage"
  >
    <template #body>
      <div
        v-if="location"
        class="flex flex-col gap-4"
      >
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <UFieldGroup>
              <UTooltip text="Reveal squares">
                <UButton
                  icon="i-lucide-square-dashed"
                  :color="selectionMode === 'rect' ? 'primary' : 'neutral'"
                  :variant="selectionMode === 'rect' ? 'solid' : 'subtle'"
                  aria-label="Reveal squares"
                  @click="onSelectionMode('rect')"
                />
              </UTooltip>

              <UTooltip text="Reveal a free-form area">
                <UButton
                  icon="i-lucide-lasso"
                  :color="selectionMode === 'freeform' ? 'primary' : 'neutral'"
                  :variant="selectionMode === 'freeform' ? 'solid' : 'subtle'"
                  aria-label="Reveal a free-form area"
                  @click="onSelectionMode('freeform')"
                />
              </UTooltip>
            </UFieldGroup>

            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-undo-2"
              title="Undo reveal"
              :disabled="!fogState.revealedAreas.length"
              @click="onUndo(location.id)"
            ></UButton>

            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-cloud-fog"
              @click="onAddFog(location.id)"
              title="Cover with fog of war"
            >
              Cover
            </UButton>

            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-cloud-sun"
              @click="onClearFog(location.id)"
              title="Clear fog of war"
            >
              Clear
            </UButton>

            <UButton
              class="ml-auto"
              :color="isActive(location.id) ? 'primary' : 'neutral'"
              :variant="isActive(location.id) ? 'solid' : 'subtle'"
              :icon="isActive(location.id) ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              :title="isActive(location.id) ? 'Hide from the display' : 'Show on the display'"
              :aria-pressed="isActive(location.id)"
              @click="onToggleDisplay(location.id)"
            >
              {{ isActive(location.id) ? 'Shown' : 'Hidden' }}
            </UButton>
          </div>

          <span class="text-xs text-neutral-500">
            {{ selectionHint }} &middot; scroll to zoom

            <template v-if="view.scale > 1">
              &middot; hold space to drag
            </template>
          </span>
        </div>

        <div
          ref="stageEl"
          tabindex="-1"
          class="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg bg-black/80 p-2 outline-none"
        >
          <LocationFogCanvas
            :image="imageSource"
            :revealed-areas="fogState.revealedAreas"
            :fog-enabled="fogState.fogEnabled"
            :view="view"
            :selection-mode="selectionMode"
            mode="dm-preview"
            interactive
            @reveal="onReveal"
            @update:view="onViewChange"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center gap-2">
        <template v-if="confirmingDelete">
          <span class="text-sm text-muted">
            Delete this location permanently?
          </span>

          <UButton
            class="ml-auto"
            color="neutral"
            variant="ghost"
            @click="confirmingDelete = false"
          >
            Cancel
          </UButton>

          <UButton
            color="error"
            @click="onDelete"
          >
            Delete
          </UButton>
        </template>

        <UButton
          v-else
          color="error"
          variant="subtle"
          icon="i-lucide-trash-2"
          @click="confirmingDelete = true"
        >
          Delete location
        </UButton>
      </div>
    </template>
  </UModal>
</template>
