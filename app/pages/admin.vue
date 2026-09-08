<script setup lang="ts">
import type { Player } from '~/types/player'

const playersStore = usePlayersStore()
const { players } = storeToRefs(playersStore)
const { addPlayer, updatePlayer, removePlayer } = playersStore

const { hydrated } = storeToRefs(useHydrationStore())
const { apiKey: leonardoApiKey } = useLeonardoApiKey()
const { style: imageStyle } = useLeonardoImageStyle()

const playerModalOpen = ref(false)
const editingPlayerId = ref<string | null>(null)
const playerForm = reactive({ name: '' })

const playerDeleteTarget = ref<Player | null>(null)

function openNewPlayer(): void {
  editingPlayerId.value = null
  playerForm.name = ''
  playerModalOpen.value = true
}

function openEditPlayer(player: Player): void {
  editingPlayerId.value = player.id
  playerForm.name = player.name
  playerModalOpen.value = true
}

function savePlayer(): void {
  const input = { name: playerForm.name.trim() }

  if (!input.name) {
    return
  }

  if (editingPlayerId.value) {
    updatePlayer(editingPlayerId.value, input)
  } else {
    addPlayer(input)
  }

  playerModalOpen.value = false
}

function confirmRemovePlayer(): void {
  if (playerDeleteTarget.value) {
    removePlayer(playerDeleteTarget.value.id)
  }

  playerDeleteTarget.value = null
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">
        Admin
      </h1>
      <p class="text-sm text-muted">
        Manage the players used across the other pages. Saved in this browser, synced across windows. NPCs are
        managed from the Points page.
      </p>
    </div>

    <div
      v-if="!hydrated"
      class="p-8 text-center text-sm text-muted"
    >
      Loading…
    </div>

    <template v-else>
      <section>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-lg font-semibold text-highlighted">
            Players
          </h2>
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="subtle"
            @click="openNewPlayer"
          >
            Add player
          </UButton>
        </div>

        <div class="overflow-x-auto rounded-lg ring ring-default bg-default">
          <div
            v-if="!players.length"
            class="p-6 text-center text-sm text-muted"
          >
            No players yet.
          </div>

          <ul
            v-else
            class="divide-y divide-default"
          >
            <li
              v-for="player in players"
              :key="player.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-highlighted">
                  {{ player.name }}
                </p>
              </div>
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="xs"
                :aria-label="`Edit ${player.name}`"
                @click="openEditPlayer(player)"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                :aria-label="`Remove ${player.name}`"
                @click="playerDeleteTarget = player"
              />
            </li>
          </ul>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="mb-3 text-lg font-semibold text-highlighted">
          AI image generation
        </h2>

        <div class="flex flex-col gap-4">
          <UFormField label="Leonardo.ai API key">
            <template #hint>
              <a
                href="https://app.leonardo.ai/api-access/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary hover:underline"
              >
                Create API token
              </a>
            </template>

            <UInput
              v-model="leonardoApiKey"
              type="password"
              class="w-full"
              placeholder="API key"
            />
          </UFormField>

          <UFormField label="Style prompt">
            <template #hint>
              Tip: upload an image you like into an LLM and ask it to describe the art style in words suitable
              for an image-generation prompt.
            </template>

            <UTextarea
              v-model="imageStyle"
              class="w-full"
              :rows="8"
              placeholder="Describe the art style used for generated NPC portraits"
            />
          </UFormField>
        </div>
      </section>
    </template>

    <UModal
      v-model:open="playerModalOpen"
      :title="editingPlayerId ? 'Edit player' : 'Add player'"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Name">
            <UInput
              v-model="playerForm.name"
              class="w-full"
              placeholder="Player name"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="playerModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            :disabled="!playerForm.name.trim()"
            @click="savePlayer"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      :open="playerDeleteTarget !== null"
      title="Remove player?"
      :description="playerDeleteTarget ? `${playerDeleteTarget.name} will be removed. This cannot be undone.` : ''"
      @update:open="value => { if (!value) playerDeleteTarget = null }"
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            color="neutral"
            variant="ghost"
            @click="playerDeleteTarget = null"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="confirmRemovePlayer"
          >
            Remove
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
