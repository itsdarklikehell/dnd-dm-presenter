<script setup lang="ts">
const props = defineProps<{ image: string, alt?: string }>()

const source = useImageSource(() => props.image)
</script>

<template>
  <UAvatar
    :src="source || undefined"
    :alt="alt"
  />
</template>
