<script setup lang="ts">
const props = defineProps<{ open: boolean, lastSavedAt: string | null }>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const lastSavedDescription = computed(() => props.lastSavedAt === null
  ? 'This data has never been saved to a zip. Save it first if you want to keep it.'
  : `Last saved to a zip on ${formatDateTime(props.lastSavedAt)}. Anything you changed after that is lost.`)
</script>

<template>
  <UModal
    :open="open"
    title="Clear all data?"
    @update:open="value => { if (!value) emit('close') }"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <p class="text-sm text-muted">
          This permanently removes every NPC, item, location, player, group and session event from this browser.
          This cannot be undone.
        </p>
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Last save"
          :description="lastSavedDescription"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="emit('close')"
        >
          Cancel
        </UButton>
        <UButton
          color="error"
          icon="i-lucide-trash-2"
          @click="emit('confirm')"
        >
          Clear everything
        </UButton>
      </div>
    </template>
  </UModal>
</template>
