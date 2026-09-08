<script setup lang="ts">
import Underline from '@tiptap/extension-underline'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/vue-3'

const modelValue = defineModel<string>({ default: '' })

const editor = useEditor({
  content: modelValue.value,
  extensions: [
    StarterKit.configure({ heading: { levels: [2] } }),
    Underline
  ],
  editorProps: {
    attributes: {
      class: 'rich-text-content min-h-32 px-3 py-2 text-sm focus:outline-none'
    }
  },
  onUpdate: ({ editor: instance }) => {
    modelValue.value = instance.getHTML()
  }
})

watch(modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, { emitUpdate: false })
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

const TOOLBAR_BUTTON_BASE = 'flex size-7 items-center justify-center rounded text-dimmed hover:bg-elevated hover:text-highlighted'
const TOOLBAR_BUTTON_ACTIVE = 'bg-elevated text-highlighted'

function buttonClass(active: boolean): string {
  return `${TOOLBAR_BUTTON_BASE} ${active ? TOOLBAR_BUTTON_ACTIVE : ''}`
}
</script>

<template>
  <div class="overflow-hidden rounded-md ring ring-default">
    <div
      v-if="editor"
      class="flex items-center gap-1 border-b border-default bg-elevated/50 px-2 py-1"
    >
      <button
        type="button"
        :class="buttonClass(editor.isActive('heading', { level: 2 }))"
        aria-label="Toggle heading"
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        <UIcon
          name="i-lucide-heading-2"
          class="size-4"
        />
      </button>
      <button
        type="button"
        :class="buttonClass(editor.isActive('bold'))"
        aria-label="Toggle bold"
        @click="editor.chain().focus().toggleBold().run()"
      >
        <UIcon
          name="i-lucide-bold"
          class="size-4"
        />
      </button>
      <button
        type="button"
        :class="buttonClass(editor.isActive('italic'))"
        aria-label="Toggle italic"
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <UIcon
          name="i-lucide-italic"
          class="size-4"
        />
      </button>
      <button
        type="button"
        :class="buttonClass(editor.isActive('underline'))"
        aria-label="Toggle underline"
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <UIcon
          name="i-lucide-underline"
          class="size-4"
        />
      </button>
      <button
        type="button"
        :class="buttonClass(editor.isActive('strike'))"
        aria-label="Toggle strikethrough"
        @click="editor.chain().focus().toggleStrike().run()"
      >
        <UIcon
          name="i-lucide-strikethrough"
          class="size-4"
        />
      </button>
    </div>

    <EditorContent
      class="bg-default text-highlighted"
      :editor="editor"
    />
  </div>
</template>
