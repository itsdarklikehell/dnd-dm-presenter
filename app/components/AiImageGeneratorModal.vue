<script setup lang="ts">
import type { Npc } from '~/types/npc'
import type { GeneratedNpcImage, LeonardoImageReference } from '~/utils/leonardoImageGenerator'

const props = defineProps<{ species: string, gender: string, age: string, role: string }>()
const open = defineModel<boolean>('open', { default: false })
const description = defineModel<string>('appearanceDescription', { default: '' })
const emit = defineEmits<{ accept: [image: GeneratedNpcImage] }>()

const { apiKey } = useLeonardoApiKey()
const { style } = useLeonardoImageStyle()
const { npcs } = storeToRefs(useNpcsStore())

const mimicImageStyleOptions = computed(() => npcs.value
  .filter(npc => npc.image)
  .map(npc => ({
    label: npc.name,
    value: npc.id,
    avatar: { src: npc.image }
  })))

const mimicImageStyleNpcId = ref('')

const isGenerating = ref(false)
const error = ref('')
const generatedImage = ref<GeneratedNpcImage | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  error.value = ''
  generatedImage.value = null
})

async function generate(): Promise<void> {
  if (!apiKey.value) {
    return
  }

  isGenerating.value = true
  error.value = ''
  generatedImage.value = null

  try {
    const mimicImageStyleNpc = npcs.value.find(npc => npc.id === mimicImageStyleNpcId.value)
    const mimicImageStyleReference = mimicImageStyleNpc ? resolveMimicImageStyleReference(mimicImageStyleNpc) : undefined

    generatedImage.value = await generateLeonardoNpcImage(apiKey.value, {
      species: props.species,
      gender: props.gender,
      age: props.age,
      role: props.role,
      description: description.value,
      style: style.value,
      mimicImageStyleReference
    })
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to generate image'
  } finally {
    isGenerating.value = false
  }
}

function resolveMimicImageStyleReference(npc: Npc): LeonardoImageReference {
  return npc.leonardoImageId
    ? { type: 'GENERATED', id: npc.leonardoImageId }
    : { type: 'BASE64', dataUri: npc.image }
}

function accept(): void {
  if (!generatedImage.value) {
    return
  }

  emit('accept', generatedImage.value)
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Generate NPC image with AI"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert
          v-if="!apiKey"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="No Leonardo.ai API key set"
        >
          <template #description>
            Add one on the
            <NuxtLink
              to="/admin"
              class="text-primary hover:underline"
            >
              Admin page
            </NuxtLink>
            before generating images.
          </template>
        </UAlert>

        <UFormField label="Appearance description">
          <UTextarea
            v-model="description"
            class="w-full"
            placeholder="e.g. mood, weight, scars, clothing, items carried"
          />
        </UFormField>

        <UFormField label="Mimic Image Style">
          <USelectMenu
            v-model="mimicImageStyleNpcId"
            :items="mimicImageStyleOptions"
            value-key="value"
            class="w-full"
            placeholder="None"
          />
        </UFormField>

        <UButton
          color="primary"
          variant="subtle"
          icon="i-lucide-sparkles"
          :loading="isGenerating"
          :disabled="!apiKey"
          class="self-start"
          @click="generate"
        >
          Generate
        </UButton>

        <p
          v-if="error"
          class="text-sm text-error"
        >
          {{ error }}
        </p>

        <div
          v-if="generatedImage"
          class="flex flex-col items-center gap-3"
        >
          <img
            :src="generatedImage.image"
            class="max-h-64 rounded object-cover"
            alt="Generated NPC portrait"
          >
        </div>
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
          :disabled="!generatedImage"
          @click="accept"
        >
          Accept
        </UButton>
      </div>
    </template>
  </UModal>
</template>
