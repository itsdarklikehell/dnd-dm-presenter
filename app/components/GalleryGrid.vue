<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { GalleryImage } from '~/types/gallery'

const props = defineProps<{
  title: string
  images: GalleryImage[]
}>()

const emit = defineEmits<{
  remove: [id: string]
  reorder: [orderedIds: string[]]
}>()

const { hydrated } = storeToRefs(useHydrationStore())

const sortableImages = ref<GalleryImage[]>([...props.images])

watch(() => props.images, (value) => {
  sortableImages.value = [...value]
})

const gridEl = ref<HTMLElement | null>(null)

useSortable(gridEl, sortableImages, {
  handle: '.drag-handle',
  animation: 150,
  watchElement: true,
  onEnd: async () => {
    await nextTick()
    emit('reorder', sortableImages.value.map(entry => entry.id))
  }
})

const deleteTarget = ref<GalleryImage | null>(null)

function confirmRemove(): void {
  if (deleteTarget.value) {
    emit('remove', deleteTarget.value.id)
  }

  deleteTarget.value = null
}
</script>

<template>
  <section>
    <div class="overflow-x-auto rounded-lg ring ring-default bg-default">
      <div
        v-if="!hydrated"
        class="p-8 text-center text-sm text-muted"
      >
        Loading {{ title.toLowerCase() }}…
      </div>

      <div
        v-else-if="!images.length"
        class="p-8 text-center text-sm text-muted"
      >
        No {{ title.toLowerCase() }} yet.
      </div>

      <div
        v-else
        ref="gridEl"
        class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
        <div
          v-for="entry in sortableImages"
          :key="entry.id"
          class="group relative aspect-square overflow-hidden rounded-lg ring ring-default"
        >
          <img
            :src="entry.image"
            alt=""
            class="h-full w-full object-cover"
          >

          <slot
            name="overlay"
            :entry="entry"
          />

          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="solid"
            size="xs"
            class="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
            :aria-label="`Delete ${title.toLowerCase()} image`"
            @click="deleteTarget = entry"
          />

          <div
            class="drag-handle absolute bottom-1 right-1 cursor-grab rounded bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
            :aria-label="`Drag to reorder ${title.toLowerCase()}`"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="size-4"
            />
          </div>
        </div>
      </div>
    </div>

    <UModal
      :open="deleteTarget !== null"
      title="Remove image?"
      :description="`This image will be removed from ${title.toLowerCase()}. This cannot be undone.`"
      @update:open="value => { if (!value) deleteTarget = null }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="deleteTarget = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmRemove"
          >
            Remove
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>
