<script setup lang="ts">
import { AWAY_SLOT, UNASSIGNED_SLOT } from '~/stores/sessionEvents'
import type { SessionGroup } from '~/stores/sessionEvents'

const npcsStore = useNpcsStore()
const { npcs } = storeToRefs(npcsStore)

const playersStore = usePlayersStore()
const { players } = storeToRefs(playersStore)

const sessionEventsStore = useSessionEventsStore()
const { rows, groups } = storeToRefs(sessionEventsStore)
const { addRow, updateRow, removeRow, participantsInSlot, assign, setGroups } = sessionEventsStore

const { hydrated } = storeToRefs(useHydrationStore())

const participants = computed(() => [
  ...players.value.map(player => ({ id: player.id, name: player.name, isPlayer: true })),
  ...npcs.value.map(npc => ({ id: npc.id, name: npc.name.split(' ')[0], isPlayer: false }))
])

const participantIds = computed(() => participants.value.map(participant => participant.id))

const TABLE_COLUMNS = computed(() => 2 + groups.value.length)
const groupColumnWidth = computed(() => `${58 / Math.max(groups.value.length, 1)}%`)

const manageGroupsOpen = ref(false)

function onSaveGroups(newGroups: SessionGroup[]): void {
  setGroups(newGroups)
}

const CHIP_BASE = 'cursor-grab select-none whitespace-nowrap rounded-full px-2 py-1 text-xs active:cursor-grabbing'
const PLAYER_CHIP_CLASS = 'bg-green-100 text-green-900 dark:bg-green-950/40 dark:text-green-200'
const NPC_CHIP_CLASS = 'bg-sky-100 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200'

function nameFor(participantId: string): string {
  return participants.value.find(participant => participant.id === participantId)?.name ?? participantId
}

function chipClass(participantId: string): string {
  const participant = participants.value.find(candidate => candidate.id === participantId)
  const colorClass = participant?.isPlayer ? PLAYER_CHIP_CLASS : NPC_CHIP_CLASS

  return `${CHIP_BASE} ${colorClass}`
}

function rowClass(index: number): string {
  return index % 2 === 1 ? 'bg-elevated/40' : ''
}

function slotLabel(slotId: string): string {
  if (slotId === UNASSIGNED_SLOT) {
    return 'Unassigned'
  }

  return 'Away'
}

function onDragStart(event: DragEvent, rowId: string, participantId: string): void {
  event.dataTransfer?.setData('text/plain', JSON.stringify({ rowId, participantId }))
}

function onDrop(event: DragEvent, rowId: string, slotId: string): void {
  const raw = event.dataTransfer?.getData('text/plain')

  if (!raw) {
    return
  }

  const data = JSON.parse(raw) as { rowId: string, participantId: string }

  if (data.rowId !== rowId) {
    return
  }

  assign(rowId, data.participantId, slotId)
}

const rowDeleteTarget = ref<string | null>(null)

function confirmRemoveRow(): void {
  if (rowDeleteTarget.value) {
    removeRow(rowDeleteTarget.value)
  }

  rowDeleteTarget.value = null
}
</script>

<template>
  <div class="w-full px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Session Events
        </h1>
        <p class="text-sm text-muted">
          Track what's happening between events, to track NPC movement and locations. Drag names from Unassigned into a group, or Away.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-users"
          @click="manageGroupsOpen = true"
        >
          Manage locations
        </UButton>

        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          @click="addRow"
        >
          Add row
        </UButton>
      </div>
    </div>

    <div
      v-if="hydrated"
      class="overflow-x-auto rounded-lg ring ring-default bg-default"
    >
      <table class="w-full table-fixed border-collapse text-sm">
        <colgroup>
          <col class="w-[18%]">
          <col class="w-[12%]">
          <col
            v-for="group in groups"
            :key="group.id"
            :style="{ width: groupColumnWidth }"
          >
          <col class="w-[12%]">
          <col class="w-10">
        </colgroup>

        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th class="px-4 py-3 text-left font-semibold text-highlighted">
              Title
            </th>
            <th class="px-4 py-3 text-left font-semibold text-highlighted">
              {{ slotLabel(UNASSIGNED_SLOT) }}
            </th>
            <th
              v-for="group in groups"
              :key="group.id"
              class="px-4 py-3 text-left font-semibold text-highlighted"
            >
              {{ group.name }}
            </th>
            <th class="px-4 py-3 text-left font-semibold text-highlighted">
              {{ slotLabel(AWAY_SLOT) }}
            </th>
            <th class="px-2 py-3" />
          </tr>
        </thead>

        <tbody>
          <template
            v-for="(row, index) in rows"
            :key="row.id"
          >
            <tr
              class="border-b border-default last:border-b-0"
              :class="rowClass(index)"
            >
              <td
                :colspan="TABLE_COLUMNS + 1"
                class="px-4 py-2"
              >
                <UTextarea
                  :model-value="row.description"
                  size="sm"
                  variant="ghost"
                  autoresize
                  placeholder="What's happening…"
                  class="w-full"
                  @update:model-value="value => updateRow(row.id, { description: String(value) })"
                />
              </td>
              <td class="px-2 py-2 align-top text-right">
                <UButton
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :aria-label="`Remove ${row.title}`"
                  @click="rowDeleteTarget = row.id"
                />
              </td>
            </tr>

            <tr
              class="border-b border-default/60"
              :class="rowClass(index)"
            >
              <td class="px-4 py-2 align-top">
                <UInput
                  :model-value="row.title"
                  size="sm"
                  variant="ghost"
                  class="w-full"
                  @update:model-value="value => updateRow(row.id, { title: String(value) })"
                />
              </td>

              <td
                class="min-h-16 px-2 py-2 align-top"
                @dragover.prevent
                @drop="onDrop($event, row.id, UNASSIGNED_SLOT)"
              >
                <div class="flex flex-wrap gap-1">
                  <div
                    v-for="participantId in participantsInSlot(row.id, UNASSIGNED_SLOT, participantIds)"
                    :key="participantId"
                    draggable="true"
                    :class="chipClass(participantId)"
                    @dragstart="onDragStart($event, row.id, participantId)"
                  >
                    {{ nameFor(participantId) }}
                  </div>
                </div>
              </td>

              <td
                v-for="group in groups"
                :key="group.id"
                class="min-h-16 min-w-0 px-2 py-2 align-top"
                @dragover.prevent
                @drop="onDrop($event, row.id, group.id)"
              >
                <div class="flex min-h-8 flex-wrap gap-1 rounded-md ring-1 ring-dashed ring-default p-1">
                  <div
                    v-for="participantId in participantsInSlot(row.id, group.id, participantIds)"
                    :key="participantId"
                    draggable="true"
                    :class="chipClass(participantId)"
                    @dragstart="onDragStart($event, row.id, participantId)"
                  >
                    {{ nameFor(participantId) }}
                  </div>
                </div>
              </td>

              <td
                class="min-h-16 px-2 py-2 align-top"
                colspan="2"
                @dragover.prevent
                @drop="onDrop($event, row.id, AWAY_SLOT)"
              >
                <div class="flex min-h-8 flex-wrap gap-1 rounded-md ring-1 ring-dashed ring-default p-1">
                  <div
                    v-for="participantId in participantsInSlot(row.id, AWAY_SLOT, participantIds)"
                    :key="participantId"
                    draggable="true"
                    :class="[chipClass(participantId), 'opacity-60']"
                    @dragstart="onDragStart($event, row.id, participantId)"
                  >
                    {{ nameFor(participantId) }}
                  </div>
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="!rows.length">
            <td
              :colspan="TABLE_COLUMNS + 2"
              class="p-8 text-center text-sm text-muted"
            >
              No rows yet. Add one to start tracking this session.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal
      :open="rowDeleteTarget !== null"
      title="Remove row?"
      description="This cannot be undone."
      @update:open="value => { if (!value) rowDeleteTarget = null }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="rowDeleteTarget = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmRemoveRow"
          >
            Remove
          </UButton>
        </div>
      </template>
    </UModal>

    <SessionEventsManageGroupsModal
      v-model:open="manageGroupsOpen"
      :groups="groups"
      @save="onSaveGroups"
    />
  </div>
</template>
