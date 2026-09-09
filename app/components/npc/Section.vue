<script setup lang="ts">
import type { Npc, NpcGroup } from '~/types/npc'

const npcsStore = useNpcsStore()
const { npcs } = storeToRefs(npcsStore)
const { removeNpc, allAway, toggleAwayForAll } = npcsStore

const npcGroupsStore = useNpcGroupsStore()
const { groups } = storeToRefs(npcGroupsStore)
const { addGroup, updateGroup, removeGroup, removeGroupWithNpcs } = npcGroupsStore

const playersStore = usePlayersStore()
const { players } = storeToRefs(playersStore)

const displayStore = useDisplayStore()
const { mode } = storeToRefs(displayStore)
const { setMode } = displayStore

const pointsStore = usePointsStore()
const { reset } = pointsStore

const { hydrated } = storeToRefs(useHydrationStore())

const npcIds = computed(() => npcs.value.map(npc => npc.id))

const everyoneAway = computed(() => hydrated.value && allAway(npcIds.value))

const ungroupedNpcs = computed(() => {
  const groupIds = new Set(groups.value.map(group => group.id))

  return npcs.value.filter(npc => !npc.groupId || !groupIds.has(npc.groupId))
})

function npcsInGroup(groupId: string): Npc[] {
  return npcs.value.filter(npc => npc.groupId === groupId)
}

const infoNpc = ref<Npc | null>(null)

const npcFormOpen = ref(false)
const editingNpc = ref<Npc | null>(null)

function openNewNpc(): void {
  editingNpc.value = null
  npcFormOpen.value = true
}

function editNpcFromView(npc: Npc): void {
  infoNpc.value = null
  nextTick(() => {
    editingNpc.value = npc
    npcFormOpen.value = true
  })
}

const npcDeleteTarget = ref<Npc | null>(null)

function requestDeleteNpc(npc: Npc): void {
  infoNpc.value = null
  nextTick(() => {
    npcDeleteTarget.value = npc
  })
}

function confirmRemoveNpc(): void {
  if (npcDeleteTarget.value) {
    removeNpc(npcDeleteTarget.value.id)
  }

  npcDeleteTarget.value = null
}

const groupModalOpen = ref(false)
const editingGroupId = ref<string | null>(null)
const groupForm = reactive({ name: '' })

const viewGroup = ref<NpcGroup | null>(null)

const groupDeleteTarget = ref<NpcGroup | null>(null)
const deleteGroupWithNpcs = ref(false)

function openNewGroup(): void {
  editingGroupId.value = null
  groupForm.name = ''
  groupModalOpen.value = true
}

function openEditGroup(group: NpcGroup): void {
  viewGroup.value = null
  nextTick(() => {
    editingGroupId.value = group.id
    groupForm.name = group.name
    groupModalOpen.value = true
  })
}

function saveGroup(): void {
  const input = { name: groupForm.name.trim() }

  if (!input.name) {
    return
  }

  if (editingGroupId.value) {
    updateGroup(editingGroupId.value, input)
  } else {
    addGroup(input)
  }

  groupModalOpen.value = false
}

function requestDeleteGroup(group: NpcGroup): void {
  viewGroup.value = null
  nextTick(() => {
    deleteGroupWithNpcs.value = false
    groupDeleteTarget.value = group
  })
}

function requestDeleteGroupWithNpcs(group: NpcGroup): void {
  viewGroup.value = null
  nextTick(() => {
    deleteGroupWithNpcs.value = true
    groupDeleteTarget.value = group
  })
}

function confirmRemoveGroup(): void {
  if (groupDeleteTarget.value) {
    if (deleteGroupWithNpcs.value) {
      removeGroupWithNpcs(groupDeleteTarget.value.id)
    } else {
      removeGroup(groupDeleteTarget.value.id)
    }
  }

  groupDeleteTarget.value = null
}

const resetOpen = ref(false)

function confirmReset(): void {
  reset()
  resetOpen.value = false
}
</script>

<template>
  <section>
    <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-highlighted">
            NPCs
          </h2>
          <UButton
            :color="mode === 'npc' ? 'error' : 'neutral'"
            :variant="mode === 'npc' ? 'solid' : 'subtle'"
            icon="i-lucide-monitor"
            size="xs"
            @click="setMode('npc')"
          >
            Live presenting
          </UButton>
        </div>
        <p class="text-sm text-muted">
          Show the name and/or image of the NPC to the players. And track the points each NPC holds for each player.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          @click="openNewNpc"
        >
          Add NPC
        </UButton>

        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-plus"
          @click="openNewGroup"
        >
          Create group
        </UButton>

        <UButton
          v-if="players.length > 0"
          color="neutral"
          variant="subtle"
          icon="i-lucide-rotate-ccw"
          @click="resetOpen = true"
        >
          Reset points
        </UButton>
      </div>
    </div>

    <div class="overflow-x-auto rounded-lg ring ring-default bg-default">
      <div
        v-if="!hydrated"
        class="p-8 text-center text-sm text-muted"
      >
        Loading NPCs…
      </div>

      <div
        v-else-if="!npcs.length"
        class="p-8 text-center text-sm text-muted"
      >
        No NPCs or players yet. Add them on the
        <ULink to="/admin">
          admin
        </ULink>
        page.
      </div>

      <table
        v-else
        class="w-full table-fixed border-collapse text-sm"
      >
        <colgroup>
          <col class="w-[26rem]">
          <col
            v-for="player in players"
            :key="player.id"
            class="w-40"
          >
        </colgroup>

        <thead>
          <tr class="border-b border-default bg-elevated/50">
            <th class="sticky left-0 z-10 bg-elevated px-4 py-3 text-left font-semibold text-highlighted">
              <div class="flex items-center justify-between gap-3">
                NPC

                <UButton
                  color="neutral"
                  variant="subtle"
                  size="xs"
                  :icon="everyoneAway ? 'i-lucide-user-check' : 'i-lucide-user-x'"
                  @click="toggleAwayForAll(npcIds)"
                >
                  {{ everyoneAway ? 'Bring everyone back' : 'Send everyone away' }}
                </UButton>
              </div>
            </th>
            <th
              v-for="player in players"
              :key="player.id"
              class="px-4 py-3 text-center font-semibold text-highlighted"
            >
              {{ player.name }}
            </th>
          </tr>
        </thead>

        <template v-if="groups.length">
          <NpcGroupSection
            v-for="group in groups"
            :key="group.id"
            :title="group.name"
            :npcs="npcsInGroup(group.id)"
            :players="players"
            :collapsible="true"
            :group-id="group.id"
            @view="npc => infoNpc = npc"
            @view-group="id => viewGroup = groups.find(candidate => candidate.id === id) ?? null"
          />
          <NpcGroupSection
            v-if="ungroupedNpcs.length"
            title="Ungrouped"
            :npcs="ungroupedNpcs"
            :players="players"
            :collapsible="true"
            @view="npc => infoNpc = npc"
          />
        </template>

        <NpcGroupSection
          v-else
          title="NPCs"
          :npcs="npcs"
          :players="players"
          :collapsible="false"
          @view="npc => infoNpc = npc"
        />
      </table>
    </div>

    <UModal
      v-model:open="resetOpen"
      title="Reset all points?"
      description="Every cell goes back to 0. This cannot be undone."
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="resetOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmReset"
          >
            Reset
          </UButton>
        </div>
      </template>
    </UModal>

    <NpcGroupViewModal
      :group="viewGroup"
      :npcs="viewGroup ? npcsInGroup(viewGroup.id) : []"
      @close="viewGroup = null"
      @edit="openEditGroup"
      @delete="requestDeleteGroup"
      @delete-with-npcs="requestDeleteGroupWithNpcs"
    />

    <UModal
      v-model:open="groupModalOpen"
      :title="editingGroupId ? 'Edit group' : 'Add group'"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Name">
            <UInput
              v-model="groupForm.name"
              class="w-full"
              placeholder="Group name"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="groupModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!groupForm.name.trim()"
            @click="saveGroup"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="groupDeleteTarget !== null"
      title="Remove group?"
      :description="groupDeleteTarget
        ? deleteGroupWithNpcs
          ? `${groupDeleteTarget.name} and its NPCs will be removed. This cannot be undone.`
          : `${groupDeleteTarget.name} will be removed. NPCs in this group become ungrouped. This cannot be undone.`
        : ''"
      @update:open="value => { if (!value) groupDeleteTarget = null }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="groupDeleteTarget = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmRemoveGroup"
          >
            Remove
          </UButton>
        </div>
      </template>
    </UModal>

    <NpcFormModal
      v-model:open="npcFormOpen"
      :npc="editingNpc"
    />

    <NpcViewModal
      :npc="infoNpc"
      @close="infoNpc = null"
      @edit="editNpcFromView"
      @delete="requestDeleteNpc"
    />

    <UModal
      :open="npcDeleteTarget !== null"
      title="Remove NPC?"
      :description="npcDeleteTarget ? `${npcDeleteTarget.name} will be removed. This cannot be undone.` : ''"
      @update:open="value => { if (!value) npcDeleteTarget = null }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="npcDeleteTarget = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmRemoveNpc"
          >
            Remove
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>
