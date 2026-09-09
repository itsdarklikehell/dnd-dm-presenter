<script setup lang="ts">
import type { SessionGroup } from '~/stores/sessionEvents'

const props = defineProps<{ groups: SessionGroup[] }>()
const emit = defineEmits<{ save: [groups: SessionGroup[]] }>()
const open = defineModel<boolean>('open', { default: false })

const draft = ref<SessionGroup[]>([])

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  draft.value = props.groups.map(group => ({ ...group }))
})

function addGroup(): void {
  draft.value = [...draft.value, { id: crypto.randomUUID(), name: `Group ${draft.value.length + 1}` }]
}

function removeGroup(id: string): void {
  draft.value = draft.value.filter(group => group.id !== id)
}

function save(): void {
  const cleaned = draft.value
    .map(group => ({ ...group, name: group.name.trim() }))
    .filter(group => group.name.length > 0)

  emit('save', cleaned)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Manage groups"
  >
    <template #body>
      <div class="flex flex-col gap-2">
        <div
          v-for="group in draft"
          :key="group.id"
          class="flex items-center gap-2"
        >
          <UInput
            v-model="group.name"
            class="w-full"
            placeholder="Group name"
          />
          <UButton
            icon="i-lucide-trash-2"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Remove ${group.name}`"
            @click="removeGroup(group.id)"
          />
        </div>

        <p
          v-if="!draft.length"
          class="text-sm text-muted"
        >
          No groups yet.
        </p>

        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          class="self-start"
          @click="addGroup"
        >
          Add new group
        </UButton>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          @click="open = false"
        >
          Cancel
        </UButton>
        <UButton
          color="primary"
          @click="save"
        >
          Save
        </UButton>
      </div>
    </template>
  </UModal>
</template>
