export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    void deleteOrphanedImages()
  })
})

async function deleteOrphanedImages(): Promise<void> {
  const referenced = new Set([
    ...useNpcsStore().npcs,
    ...useItemsStore().items,
    ...useLocationsStore().locations
  ].map(entry => entry.image))

  const orphaned = (await listImageRefs()).filter(ref => !referenced.has(ref))

  await Promise.all(orphaned.map(deleteImageBlob))
}
