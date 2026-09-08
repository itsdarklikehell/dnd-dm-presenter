<script setup lang="ts">
import type { Location } from '~/types/location'
import type { LocationView, Rect } from '~/types/locationDisplay'

const props = defineProps<{ location: Location | null }>()

const emit = defineEmits<{
  close: []
}>()

const locationDisplayStore = useLocationDisplayStore()
const { getFogState, getView, setView, addFog, clearFog, revealRect } = locationDisplayStore

const { removeLocation } = useLocationsStore()

const confirmingDelete = ref(false)

const stageEl = ref<HTMLElement | null>(null)

const fogState = computed(() => props.location ? getFogState(props.location.id) : { fogEnabled: false, revealedRects: [] })
const imageSource = useImageSource(() => props.location?.image ?? '')

const view = computed(() => props.location ? getView(props.location.id) : { scale: 1, offsetX: 0, offsetY: 0 })

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

function onReveal(rect: Rect): void {
  if (props.location) {
    revealRect(props.location.id, rect)
  }
}

function onDelete(): void {
  if (props.location) {
    removeLocation(props.location.id)
  }

  emit('close')
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
        <div class="flex flex-wrap items-center gap-2">
          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-cloud-fog"
            @click="onAddFog(location.id)"
          >
            Cover with fog of war
          </UButton>

          <UButton
            color="neutral"
            variant="subtle"
            icon="i-lucide-cloud-sun"
            @click="onClearFog(location.id)"
          >
            Clear fog of war
          </UButton>

          <span class="text-xs text-neutral-500">
            Scroll to zoom &middot; hold space to drag
          </span>
        </div>

        <div
          ref="stageEl"
          tabindex="-1"
          class="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg bg-black/80 p-2 outline-none"
        >
          <LocationFogCanvas
            :image="imageSource"
            :revealed-rects="fogState.revealedRects"
            :fog-enabled="fogState.fogEnabled"
            :view="view"
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
