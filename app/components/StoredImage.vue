<script setup lang="ts">
const props = defineProps<{ image: string, alt?: string }>()

const source = useImageSource(() => props.image)
</script>

<template>
  <img
    v-if="source"
    :src="source"
    :alt="alt ?? ''"
    decoding="async"
  >
</template>
