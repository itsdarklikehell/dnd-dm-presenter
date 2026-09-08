<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type Sortable from 'sortablejs'
import type { Npc } from '~/types/npc'
import type { Player } from '~/types/player'

const props = defineProps<{
  title: string
  npcs: Npc[]
  players: Player[]
  collapsible: boolean
  groupId?: string
}>()

const emit = defineEmits<{
  view: [npc: Npc]
  viewGroup: [groupId: string]
}>()

const npcsStore = useNpcsStore()
const { isFlagSet, toggleFlag, updateNpc, reorderSubset } = npcsStore

const pointsStore = usePointsStore()
const { pointsFor, adjust } = pointsStore

const collapsed = ref(false)

const UNGROUPED = '__ungrouped__'

const rowsBody = ref<HTMLElement | null>(null)

function onDragEnd(event: Sortable.SortableEvent): void {
  const npcId = event.item.dataset.npcId
  const toEl = event.to
  const fromEl = event.from

  if (!npcId || !toEl || !fromEl || event.oldIndex === undefined || event.newIndex === undefined) {
    return
  }

  const targetGroupId = toEl.dataset.groupId === UNGROUPED ? undefined : toEl.dataset.groupId
  const beforeId = event.newIndex > 0 ? (toEl.children[event.newIndex - 1] as HTMLElement | undefined)?.dataset.npcId ?? null : null

  if (fromEl !== toEl || event.oldIndex !== event.newIndex) {
    toEl.removeChild(event.item)
    fromEl.insertBefore(event.item, fromEl.children[event.oldIndex] ?? null)
  }

  nextTick(() => {
    updateNpc(npcId, { groupId: targetGroupId })

    const targetMembers = npcsStore.npcs
      .filter(npc => npc.groupId === targetGroupId && npc.id !== npcId)
      .map(npc => npc.id)
    const insertAt = beforeId ? targetMembers.indexOf(beforeId) + 1 : 0
    const orderedIds = [...targetMembers.slice(0, insertAt), npcId, ...targetMembers.slice(insertAt)]

    reorderSubset(orderedIds)
  })
}

useSortable(rowsBody, computed(() => props.npcs), {
  handle: '.drag-handle',
  animation: 150,
  watchElement: true,
  group: 'npc-rows',
  onUpdate: () => {},
  onEnd: onDragEnd
})

function pointsClass(value: number): string {
  if (value > 0) {
    return 'text-primary'
  }

  if (value < 0) {
    return 'text-error'
  }

  return 'text-dimmed'
}
</script>

<template>
  <tbody>
    <tr
      v-if="collapsible"
      class="border-b border-default bg-elevated/30"
    >
      <th
        class="sticky left-0 z-10 bg-elevated px-4 py-2 text-left"
        :colspan="players.length + 1"
      >
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-dimmed hover:text-highlighted"
            :aria-label="collapsed ? `Expand ${title}` : `Collapse ${title}`"
            @click="collapsed = !collapsed"
          >
            <UIcon
              :name="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-down'"
              class="size-4"
            />
          </button>

          <button
            type="button"
            class="flex items-center gap-2 text-sm font-semibold text-highlighted hover:opacity-75"
            @click="groupId ? emit('viewGroup', groupId) : collapsed = !collapsed"
          >
            {{ title }}
            <span class="text-xs font-normal text-muted">({{ npcs.length }})</span>
          </button>
        </div>
      </th>
    </tr>
  </tbody>

  <tbody
    v-show="!collapsed"
    ref="rowsBody"
    :data-group-id="groupId ?? UNGROUPED"
  >
    <tr
      v-for="npc in npcs"
      :key="npc.id"
      :data-npc-id="npc.id"
      class="border-b border-default last:border-b-0 hover:bg-elevated/30"
      :class="isFlagSet(npc.id, 'away') ? 'bg-elevated/20' : ''"
    >
      <th class="sticky left-0 z-10 bg-default px-4 py-2 text-left font-medium">
        <div class="flex items-center gap-3">
          <div
            class="drag-handle shrink-0 cursor-grab text-dimmed hover:text-highlighted active:cursor-grabbing"
            :aria-label="`Drag to reorder ${npc.name}`"
          >
            <UIcon
              name="i-lucide-grip-vertical"
              class="size-4"
            />
          </div>

          <button
            type="button"
            class="flex min-w-0 items-center gap-3 rounded hover:opacity-75"
            :aria-label="`View info for ${npc.name}`"
            @click="emit('view', npc)"
          >
            <UAvatar
              :src="npc.image"
              :alt="npc.name"
              size="lg"
              class="shrink-0"
              :class="isFlagSet(npc.id, 'away') ? 'grayscale opacity-50' : ''"
            />
            <span
              class="truncate"
              :class="isFlagSet(npc.id, 'away') ? 'text-dimmed line-through' : 'text-highlighted'"
            >
              {{ npc.name }}
            </span>
          </button>

          <div class="ml-auto flex shrink-0 items-center gap-3">
            <UTooltip :text="`Toggle whether ${npc.name}'s name is known`">
              <UButton
                :icon="'i-lucide-handshake'"
                :color="isFlagSet(npc.id, 'introduced') ? 'primary' : 'neutral'"
                :variant="isFlagSet(npc.id, 'introduced') ? 'solid' : 'ghost'"
                size="xs"
                :aria-label="`Toggle whether ${npc.name}'s name is known`"
                @click="toggleFlag(npc.id, 'introduced')"
              />
            </UTooltip>

            <UTooltip :text="npc.image ? `Toggle whether ${npc.name} has been seen` : `${npc.name} has no image yet`">
              <UButton
                :icon="'i-lucide-eye'"
                :color="isFlagSet(npc.id, 'seen') ? 'primary' : 'neutral'"
                :variant="isFlagSet(npc.id, 'seen') ? 'solid' : 'ghost'"
                size="xs"
                :disabled="!npc.image"
                :aria-label="`Toggle whether ${npc.name} has been seen`"
                @click="toggleFlag(npc.id, 'seen')"
              />
            </UTooltip>

            <USwitch
              :model-value="!isFlagSet(npc.id, 'away')"
              :label="isFlagSet(npc.id, 'away') ? 'Away' : 'Present'"
              :ui="{ label: 'w-16' }"
              size="sm"
              :aria-label="`Toggle whether ${npc.name} is present`"
              @update:model-value="toggleFlag(npc.id, 'away')"
            />
          </div>
        </div>
      </th>

      <td
        v-for="player in players"
        :key="player.id"
        class="px-2 py-2 text-center"
      >
        <div class="flex items-center justify-center gap-1">
          <UButton
            icon="i-lucide-minus"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Lower ${npc.name} points for ${player.name}`"
            @click="adjust(npc.id, player.id, -1)"
          />
          <span
            class="w-8 text-base font-semibold tabular-nums"
            :class="pointsClass(pointsFor(npc.id, player.id))"
          >
            {{ pointsFor(npc.id, player.id) }}
          </span>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="`Raise ${npc.name} points for ${player.name}`"
            @click="adjust(npc.id, player.id, 1)"
          />
        </div>
      </td>
    </tr>
  </tbody>
</template>
