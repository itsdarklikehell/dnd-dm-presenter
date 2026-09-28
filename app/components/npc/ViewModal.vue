<script setup lang="ts">
import type { Npc } from '~/types/npc'

const props = defineProps<{ npc: Npc | null }>()

const emit = defineEmits<{
  close: []
  edit: [npc: Npc]
  delete: [npc: Npc]
}>()

const zoomed = ref(false)
const fullImage = useImageSource(() => props.npc?.image ?? '')

watch(() => props.npc, () => {
  zoomed.value = false
})
</script>

<template>
  <UModal
    :open="npc !== null"
    :title="npc?.name"
    :ui="{ content: 'sm:max-w-2xl' }"
    @update:open="value => { if (!value) emit('close') }"
  >
    <template #body>
      <div
        v-if="npc"
        class="flex flex-col gap-4"
      >
        <div class="flex items-start gap-4">
          <button
            type="button"
            class="shrink-0 cursor-zoom-in rounded-full disabled:cursor-default"
            :disabled="!npc.image"
            :aria-label="`Show the full-size portrait of ${npc.name}`"
            @click="zoomed = true"
          >
            <StoredAvatar
              :image="npc.image"
              :alt="npc.name"
              size="3xl"
              :ui="{ root: 'size-50' }"
            />
          </button>

          <UModal
            v-model:open="zoomed"
            :title="npc.name"
            :ui="{ content: 'sm:max-w-4xl', body: 'flex justify-center' }"
          >
            <template #body>
              <img
                :src="fullImage"
                :alt="npc.name"
                class="max-h-[80vh] w-auto object-contain"
              >
            </template>
          </UModal>
          <div class="flex flex-col gap-2">
            <div
              v-if="npc.species || npc.gender || npc.age || npc.role"
              class="flex flex-wrap gap-1"
            >
              <UBadge
                v-if="npc.species"
                color="neutral"
                variant="subtle"
              >
                {{ npc.species }}
              </UBadge>
              <UBadge
                v-if="npc.gender"
                color="neutral"
                variant="subtle"
              >
                {{ npc.gender }}
              </UBadge>
              <UBadge
                v-if="npc.age"
                color="neutral"
                variant="subtle"
              >
                {{ npc.age }}
              </UBadge>
              <UBadge
                v-if="npc.role"
                color="neutral"
                variant="subtle"
              >
                {{ npc.role }}
              </UBadge>
            </div>

            <!-- eslint-disable vue/no-v-html -- description is TipTap output stored locally on this device -->
            <div
              v-if="npc.description"
              class="rich-text-content text-sm text-muted"
              v-html="npc.description"
            />
            <!-- eslint-enable vue/no-v-html -->
            <p
              v-else
              class="text-sm text-muted"
            >
              No description yet.
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div
        v-if="npc"
        class="flex w-full justify-between gap-2"
      >
        <UButton
          color="error"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="emit('delete', npc)"
        >
          Delete
        </UButton>
        <UButton
          color="neutral"
          variant="subtle"
          icon="i-lucide-pencil"
          @click="emit('edit', npc)"
        >
          Edit
        </UButton>
      </div>
    </template>
  </UModal>
</template>
