<script setup lang="ts">
const baseURL = useRuntimeConfig().app.baseURL.replace(/\/$/, '')
const miniViewerOpen = ref(true)
</script>

<template>
  <UContainer class="py-8">
    <div class="flex flex-col gap-8">
      <NpcSection />
      <ItemGallery />
      <LocationGallery />
    </div>

    <div class="fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-lg shadow-xl ring ring-default bg-default">
      <div class="flex items-center justify-between gap-2 bg-elevated px-3 py-1.5">
        <span class="text-xs font-medium text-highlighted">Player view</span>

        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-external-link"
            color="neutral"
            variant="ghost"
            size="xs"
            :to="`${baseURL}/present`"
            target="_blank"
            aria-label="Open full player view"
          />
          <UButton
            :icon="miniViewerOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-up'"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="miniViewerOpen ? 'Collapse player view preview' : 'Expand player view preview'"
            @click="miniViewerOpen = !miniViewerOpen"
          />
        </div>
      </div>

      <div
        v-show="miniViewerOpen"
        class="aspect-video w-full bg-black"
      >
        <PresentView />
      </div>
    </div>
  </UContainer>
</template>
