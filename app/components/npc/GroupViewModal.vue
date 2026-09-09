<script setup lang="ts">
import type { Npc, NpcGroup } from '~/types/npc'

defineProps<{ group: NpcGroup | null, npcs: Npc[] }>()

const emit = defineEmits<{
  close: []
  edit: [group: NpcGroup]
  delete: [group: NpcGroup]
  deleteWithNpcs: [group: NpcGroup]
}>()
</script>

<template>
  <UModal
    :open="group !== null"
    :title="group?.name"
    @update:open="value => { if (!value) emit('close') }"
  >
    <template #body>
      <div
        v-if="group"
        class="flex flex-col gap-2"
      >
        <p
          v-if="!npcs.length"
          class="text-sm text-muted"
        >
          No NPCs in this group yet.
        </p>

        <ul
          v-else
          class="flex flex-wrap gap-1"
        >
          <li
            v-for="npc in npcs"
            :key="npc.id"
          >
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ npc.name }}
            </UBadge>
          </li>
        </ul>
      </div>
    </template>

    <template #footer>
      <div
        v-if="group"
        class="flex w-full justify-between gap-2"
      >
        <div class="flex gap-2">
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="emit('delete', group)"
          >
            Delete
          </UButton>
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            @click="emit('deleteWithNpcs', group)"
          >
            Delete with NPCs
          </UButton>
        </div>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-pencil"
          @click="emit('edit', group)"
        >
          Edit
        </UButton>
      </div>
    </template>
  </UModal>
</template>
