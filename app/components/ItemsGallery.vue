<script setup lang="ts">
import type { GalleryImage } from '~/types/gallery'
import type { Item } from '~/types/item'

const itemsStore = useItemsStore()
const { items } = storeToRefs(itemsStore)
const { removeItem, reorderItems } = itemsStore

const displayStore = useDisplayStore()
const { mode } = storeToRefs(displayStore)
const { isDisplayed, toggleDisplay, setMode } = displayStore

const formOpen = ref(false)
const editingItem = ref<Item | null>(null)

function openNew(): void {
  editingItem.value = null
  formOpen.value = true
}

function openEdit(entry: GalleryImage): void {
  editingItem.value = { id: entry.id, image: entry.image, name: entry.name ?? '' }
  formOpen.value = true
}
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold text-highlighted">
          Items
        </h2>
        <UButton
          :color="mode === 'item' ? 'error' : 'neutral'"
          :variant="mode === 'item' ? 'solid' : 'subtle'"
          icon="i-lucide-monitor"
          size="xs"
          @click="setMode('item')"
        >
          Live presenting
        </UButton>
      </div>

      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="subtle"
        @click="openNew"
      >
        Add item
      </UButton>
    </div>

    <GalleryGrid
      title="Items"
      :images="items"
      @remove="removeItem"
      @reorder="reorderItems"
    >
      <template #overlay="{ entry }">
        <USwitch
          :model-value="isDisplayed('item', entry.id)"
          :label="isDisplayed('item', entry.id) ? 'Shown' : 'Hidden'"
          :ui="{ label: 'w-14 text-white' }"
          size="sm"
          class="absolute left-1 top-1 rounded bg-black/50 px-1.5 py-1"
          aria-label="Toggle whether this item is displayed"
          @update:model-value="toggleDisplay('item', entry.id)"
        />

        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="solid"
          size="xs"
          class="absolute right-1 top-9 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Edit item name"
          @click="openEdit(entry)"
        />

        <div
          v-if="entry.name"
          class="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-black/60 px-2 py-1 pr-8 text-center text-xs text-white"
        >
          {{ entry.name }}
        </div>
      </template>
    </GalleryGrid>

    <ItemFormModal
      v-model:open="formOpen"
      :item="editingItem"
    />
  </section>
</template>
