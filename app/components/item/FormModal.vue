<script setup lang="ts">
import type { Item } from '~/types/item'

const props = defineProps<{ item?: Item | null }>()
const open = defineModel<boolean>('open', { default: false })

const { addItem, updateItem, removeItem } = useItemsStore()

const form = reactive({ name: '', image: '' })

const confirmingDelete = ref(false)

const zoomed = ref(false)
const fullImage = useImageSource(() => form.image)

watch(open, (isOpen) => {
  confirmingDelete.value = false
  zoomed.value = false

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

  form.image = await putImageBlob(await convertImageFileToWebpBlob(file, PORTRAIT_IMAGE_ENCODING))
}

function remove(): void {
  if (props.item) {
    removeItem(props.item.id)
  }

  open.value = false
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
            <button
              type="button"
              class="shrink-0 cursor-zoom-in rounded disabled:cursor-default"
              :disabled="!form.image"
              :aria-label="`Show the full-size image of ${form.name || 'this item'}`"
              @click="zoomed = true"
            >
              <StoredImage
                :image="form.image"
                :alt="form.name"
                class="size-50 rounded object-contain"
              />
            </button>

            <UModal
              v-model:open="zoomed"
              :title="form.name || 'Item'"
              :ui="{ content: 'sm:max-w-4xl', body: 'flex justify-center' }"
            >
              <template #body>
                <img
                  :src="fullImage"
                  :alt="form.name"
                  class="max-h-[80vh] w-auto object-contain"
                >
              </template>
            </UModal>
            <UFileUpload
              accept="image/*"
              label="Choose image"
              class="size-50 shrink-0"
              :ui="{ fileLeadingAvatar: '[&>img]:object-contain' }"
              @update:model-value="onImageFileChange"
            />
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center gap-2 w-full">
        <template v-if="confirmingDelete">
          <span class="text-sm text-muted">
            Delete this item permanently?
          </span>

          <UButton
            class="ml-auto"
            color="neutral"
            variant="ghost"
            @click="confirmingDelete = false"
          >
            Cancel
          </UButton>

          <UButton
            color="error"
            @click="remove"
          >
            Delete
          </UButton>
        </template>

        <template v-else>
          <UButton
            v-if="item"
            color="error"
            variant="subtle"
            icon="i-lucide-trash-2"
            @click="confirmingDelete = true"
          >
            Delete
          </UButton>

          <UButton
            class="ml-auto"
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
        </template>
      </div>
    </template>
  </UModal>
</template>
