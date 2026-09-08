<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { GalleryImage } from '~/types/gallery'

const props = defineProps<{
  title: string
  images: GalleryImage[]
}>()

const emit = defineEmits<{
  select: [entry: GalleryImage]
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
          <button
            type="button"
            class="block h-full w-full cursor-pointer"
            :aria-label="`Open ${entry.name || title.toLowerCase()}`"
            @click="emit('select', entry)"
          >
            <StoredImage
              :image="entry.image"
              loading="lazy"
              class="h-full w-full object-cover transition-opacity group-hover:opacity-80"
            />
          </button>

          <slot
            name="overlay"
            :entry="entry"
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
  </section>
</template>
