<script setup lang="ts">
const npcsStore = useNpcsStore()
const { npcs } = storeToRefs(npcsStore)
const { isFlagSet } = npcsStore

const itemsStore = useItemsStore()
const { items } = storeToRefs(itemsStore)

const locationsStore = useLocationsStore()
const { locations } = storeToRefs(locationsStore)

const displayStore = useDisplayStore()
const { mode } = storeToRefs(displayStore)
const { isDisplayed } = displayStore

const locationDisplayStore = useLocationDisplayStore()
const { activeLocationId } = storeToRefs(locationDisplayStore)
const { getFogState, getView } = locationDisplayStore

const { hydrated } = storeToRefs(useHydrationStore())

const presentNpcs = computed(() => hydrated.value ? npcs.value.filter(npc => !isFlagSet(npc.id, 'away')) : [])
const displayedItems = computed(() => items.value.filter(entry => isDisplayed('item', entry.id)))
const activeLocation = computed(() => activeLocationId.value
  ? locations.value.find(entry => entry.id === activeLocationId.value) ?? null
  : null)

const activeLocationSource = useImageSource(() => activeLocation.value?.image ?? '')

const activeEntries = computed(() => mode.value === 'item' ? displayedItems.value : presentNpcs.value)

const columns = computed(() => {
  const count = activeEntries.value.length
  if (count === 3) return 3
  return Math.max(1, Math.ceil(Math.sqrt(count)))
})
const rows = computed(() => Math.max(1, Math.ceil(activeEntries.value.length / columns.value)))

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value}, 1fr)`,
  gridTemplateRows: `repeat(${rows.value}, 1fr)`
}))

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Tangerine:wght@400;700&display=swap' }
  ]
})
</script>

<template>
  <div class="@container h-full w-full overflow-hidden bg-white">
    <template v-if="mode === 'npc'">
      <div
        v-if="presentNpcs.length"
        class="grid h-full w-full overflow-hidden"
        :style="gridStyle"
      >
        <div
          v-for="npc in presentNpcs"
          :key="npc.id"
          class="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden"
        >
          <StoredImage
            :image="npc.image"
            :alt="npc.name"
            class="block min-h-0 w-full flex-1 object-contain"
            :class="isFlagSet(npc.id, 'seen') ? '' : 'blur-xl'"
          />

          <div
            v-if="isFlagSet(npc.id, 'introduced')"
            class="tangerine-bold shrink-0 bg-white py-1 text-center text-[4cqw] text-black"
          >
            {{ npc.name }}
          </div>
        </div>
      </div>

      <div
        v-else-if="hydrated"
        class="flex h-full w-full items-center justify-center text-[3cqw] text-black/40"
      >
        No NPCs present
      </div>
    </template>

    <template v-else-if="mode === 'location'">
      <div
        v-if="activeLocation"
        class="flex h-full w-full items-center justify-center overflow-hidden bg-black"
      >
        <LocationFogCanvas
          :image="activeLocationSource"
          :revealed-rects="getFogState(activeLocation.id).revealedRects"
          :fog-enabled="getFogState(activeLocation.id).fogEnabled"
          :view="getView(activeLocation.id)"
          mode="true-fog"
        />
      </div>

      <div
        v-else-if="hydrated"
        class="flex h-full w-full items-center justify-center bg-black text-[3cqw] text-white/40"
      >
        No locations displayed
      </div>
    </template>

    <template v-else>
      <div
        v-if="activeEntries.length"
        class="grid h-full w-full overflow-hidden bg-white"
        :style="gridStyle"
      >
        <div
          v-for="entry in activeEntries"
          :key="entry.id"
          class="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center overflow-hidden"
        >
          <StoredImage
            :image="entry.image"
            class="block min-h-0 w-full flex-1 object-contain"
          />

          <div
            v-if="entry.name"
            class="tangerine-bold shrink-0 bg-white py-1 text-center text-[4cqw] text-black"
          >
            {{ entry.name }}
          </div>
        </div>
      </div>

      <div
        v-else-if="hydrated"
        class="flex h-full w-full items-center justify-center bg-white text-[3cqw] text-white/40"
      >
        No items displayed
      </div>
    </template>
  </div>
</template>

<style scoped>
.tangerine-regular {
  font-family: "Tangerine", cursive;
  font-weight: 400;
  font-style: normal;
}

.tangerine-bold {
  font-family: "Tangerine", cursive;
  font-weight: 700;
  font-style: normal;
}
</style>
