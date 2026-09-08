<script setup lang="ts">
import type { Item } from '~/types/item'

const props = defineProps<{ item?: Item | null }>()
const open = defineModel<boolean>('open', { default: false })

const { addItem, updateItem } = useItemsStore()

const form = reactive({ name: '', image: '' })

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  form.name = props.item?.name ?? ''
  form.image = props.item?.image ?? ''
})

async function onImageFileChange(file: File | null | undefined): Promise<void> {
  if (!file) {
    return
  }

  form.image = await convertImageFileToWebp(file)
}

function save(): void {
  const input = {
    name: form.name.trim(),
    image: form.image.trim()
  }

  if (!input.image) {
    return
  }

  if (props.item) {
    updateItem(props.item.id, input)
  } else {
    addItem(input.image, input.name)
  }

  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="item ? 'Edit item' : 'Add item'"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name">
          <UInput
            v-model="form.name"
            class="w-full"
            placeholder="Item name (optional)"
            autofocus
            @keyup.enter="save"
          />
        </UFormField>

        <UFormField label="Image">
          <div class="flex items-center gap-3">
            <img
              v-if="form.image"
              :src="form.image"
              class="size-12 rounded object-cover"
              alt=""
            >
            <UFileUpload
              accept="image/*"
              label="Choose image"
              class="flex-1"
              @update:model-value="onImageFileChange"
            />
          </div>
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
          :disabled="!form.image.trim()"
          @click="save"
        >
          {{ item ? 'Save' : 'Add item' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
