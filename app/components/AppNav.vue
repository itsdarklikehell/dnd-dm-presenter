<script setup lang="ts">
const baseURL = useRuntimeConfig().app.baseURL.replace(/\/$/, '')

const items = [
  { label: 'NPCs, Items & Locations', icon: 'i-lucide-users', to: '/' },
  { label: 'Session Events', icon: 'i-lucide-calendar-days', to: '/session-events' },
  { label: 'NPC Display', icon: 'i-lucide-monitor', to: `${baseURL}/present`, target: '_blank' },
  { label: 'Admin', icon: 'i-lucide-settings', to: '/admin' }
]

const { exportState, importState, clearState } = useStateBackup()
const toast = useToast()
const { lastSavedAt } = storeToRefs(useBackupStore())

const fileInput = ref<HTMLInputElement>()
const clearModalOpen = ref(false)

function triggerLoad(): void {
  fileInput.value?.click()
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  input.value = ''

  if (!file) {
    return
  }

  try {
    await importState(file)
  } catch (error) {
    toast.add({
      title: 'Could not load that zip',
      description: error instanceof Error ? error.message : 'Unknown error',
      color: 'error',
      icon: 'i-lucide-triangle-alert'
    })
  }
}

const storageUsageStore = useStorageUsageStore()
const { usedBytes, limitBytes } = storeToRefs(storageUsageStore)
const { refresh: refreshStorageUsage } = storageUsageStore
const usagePercent = computed(() => Math.min(100, (usedBytes.value / limitBytes.value) * 100))
const usageColor = computed(() => usagePercent.value >= 90 ? 'text-error' : 'text-muted')

let storageUsagePoll: ReturnType<typeof setInterval>

onMounted(() => {
  void refreshStorageUsage()
  storageUsagePoll = setInterval(() => void refreshStorageUsage(), 3000)
})

onBeforeUnmount(() => {
  clearInterval(storageUsagePoll)
})
</script>

<template>
  <div class="border-b border-default bg-default">
    <UContainer class="flex items-center justify-between">
      <UNavigationMenu
        :items="items"
        class="flex-1"
      />

      <div class="flex items-center gap-3">
        <span
          class="text-xs whitespace-nowrap"
          :class="usageColor"
          :title="`${formatBytes(usedBytes)} of ~${formatBytes(limitBytes)} browser storage used`"
        >
          {{ formatBytes(usedBytes) }} / {{ formatBytes(limitBytes) }}
        </span>
        <UColorModeButton />
        <UButton
          icon="i-lucide-save"
          color="neutral"
          variant="ghost"
          title="Save state to zip"
          @click="() => exportState()"
        />
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          title="Load state from zip"
          @click="triggerLoad"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="neutral"
          variant="ghost"
          title="Clear all data"
          @click="clearModalOpen = true"
        />
        <input
          ref="fileInput"
          type="file"
          accept="application/zip,.zip"
          class="hidden"
          @change="onFileSelected"
        >
      </div>
    </UContainer>

    <ClearStateModal
      :open="clearModalOpen"
      :last-saved-at="lastSavedAt"
      @close="clearModalOpen = false"
      @confirm="() => clearState()"
    />
  </div>
</template>
