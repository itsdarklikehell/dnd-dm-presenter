<script setup lang="ts">
import type { Npc } from '~/types/npc'
import type { GeneratedNpcImage } from '~/utils/leonardoImageGenerator'

const props = defineProps<{ npc?: Npc | null }>()
const open = defineModel<boolean>('open', { default: false })

const { addNpc, updateNpc } = useNpcsStore()

const { groups } = storeToRefs(useNpcGroupsStore())
const NO_GROUP = '__none__'
const groupOptions = computed(() => [
  { label: 'No group', value: NO_GROUP },
  ...groups.value.map(group => ({ label: group.name, value: group.id }))
])

const SPECIES_OPTIONS = ref(['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goblin', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Orc', 'Tiefling'])
const AGE_OPTIONS = ['Child', 'Teenager', 'Young adult', 'Adult', 'Middle-aged', 'Elderly']

const form = reactive({
  name: '',
  image: '',
  leonardoImageId: undefined as string | undefined,
  species: '',
  gender: '',
  age: '',
  role: '',
  description: '',
  appearanceDescription: '',
  groupId: undefined as string | undefined
})

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  form.name = props.npc?.name ?? ''
  form.image = props.npc?.image ?? ''
  form.leonardoImageId = props.npc?.leonardoImageId
  form.species = props.npc?.species ?? ''
  form.gender = props.npc?.gender ?? ''
  form.age = props.npc?.age ?? ''
  form.role = props.npc?.role ?? ''
  form.description = props.npc?.description ?? ''
  form.appearanceDescription = props.npc?.appearanceDescription ?? ''
  form.groupId = props.npc?.groupId ?? NO_GROUP
  aiValidationAttempted.value = false
})

function onSpeciesCreate(species: string): void {
  SPECIES_OPTIONS.value.push(species)
  SPECIES_OPTIONS.value.sort()
  form.species = species
}

async function onImageFileChange(file: File | null | undefined): Promise<void> {
  if (!file) {
    return
  }

  form.image = await putImageBlob(await convertImageFileToWebpBlob(file, PORTRAIT_IMAGE_ENCODING))
  form.leonardoImageId = undefined
}

function save(): void {
  const input = {
    name: form.name.trim(),
    image: form.image.trim(),
    leonardoImageId: form.leonardoImageId,
    species: form.species,
    gender: form.gender.trim(),
    age: form.age,
    role: form.role.trim(),
    description: form.description.trim(),
    appearanceDescription: form.appearanceDescription.trim(),
    groupId: form.groupId === NO_GROUP ? undefined : form.groupId
  }

  if (!input.name) {
    return
  }

  if (props.npc) {
    updateNpc(props.npc.id, input)
  } else {
    addNpc(input)
  }

  open.value = false
}

const aiGeneratorOpen = ref(false)
const aiFieldsComplete = computed(() => Boolean(form.species && form.gender.trim() && form.age && form.role.trim()))
const aiValidationAttempted = ref(false)

function openAiGenerator(): void {
  if (!aiFieldsComplete.value) {
    aiValidationAttempted.value = true
    return
  }

  aiGeneratorOpen.value = true
}

function onAiImageAccepted(generated: GeneratedNpcImage): void {
  form.image = generated.image
  form.leonardoImageId = generated.leonardoImageId
  save()
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="npc ? 'Edit NPC' : 'Add NPC'"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name">
          <UInput
            v-model="form.name"
            class="w-full"
            placeholder="NPC name"
          />
        </UFormField>

        <UFormField
          v-if="groupOptions.length > 0"
          label="Group"
        >
          <USelect
            v-model="form.groupId"
            :items="groupOptions"
            value-key="value"
            placeholder="No group"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField
            label="Species"
            :error="aiValidationAttempted && !form.species ? 'Required to generate with AI' : undefined"
          >
            <UInputMenu
              v-model="form.species"
              :items="SPECIES_OPTIONS"
              create-item
              class="w-full"
              placeholder="e.g. Elf"
              @create="onSpeciesCreate"
            />
          </UFormField>

          <UFormField
            label="Gender"
            :error="aiValidationAttempted && !form.gender.trim() ? 'Required to generate with AI' : undefined"
          >
            <UInput
              v-model="form.gender"
              class="w-full"
              placeholder="e.g. female"
            />
          </UFormField>

          <UFormField
            label="Age"
            :error="aiValidationAttempted && !form.age ? 'Required to generate with AI' : undefined"
          >
            <USelect
              v-model="form.age"
              :items="AGE_OPTIONS"
              class="w-full"
              placeholder="Select age"
            />
          </UFormField>

          <UFormField
            label="Occupation / role"
            :error="aiValidationAttempted && !form.role.trim() ? 'Required to generate with AI' : undefined"
          >
            <UInput
              v-model="form.role"
              class="w-full"
              placeholder="e.g. blacksmith"
            />
          </UFormField>
        </div>

        <UFormField
          label="Image"
        >
          <div class="flex items-center gap-3">
            <UFileUpload
              accept="image/*"
              label="Choose image"
              class="size-50 shrink-0"
              :ui="{ fileLeadingAvatar: '[&>img]:object-contain' }"
              @update:model-value="onImageFileChange"
            />
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-sparkles"
              @click="openAiGenerator"
            >
              Generate with AI
            </UButton>
          </div>
        </UFormField>

        <UFormField label="Description">
          <RichTextEditor v-model="form.description" />
        </UFormField>
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
          :disabled="!form.name.trim()"
          @click="save"
        >
          Save
        </UButton>
      </div>
    </template>
  </UModal>

  <AiImageGeneratorModal
    v-model:open="aiGeneratorOpen"
    v-model:appearance-description="form.appearanceDescription"
    :species="form.species"
    :gender="form.gender"
    :age="form.age"
    :role="form.role"
    @accept="onAiImageAccepted"
  />
</template>
