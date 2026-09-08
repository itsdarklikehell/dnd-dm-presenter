export interface ImageOwner {
  image: string
}

export async function releaseImages(entries: ImageOwner[]): Promise<void> {
  const refs = entries.map(entry => entry.image).filter(isImageRef)

  await Promise.all(refs.map(deleteImageBlob))
}

export function replacedImages<T extends { id: string, image: string }>(
  entries: T[],
  id: string,
  nextImage: string | undefined
): ImageOwner[] {
  if (nextImage === undefined) {
    return []
  }

  const current = entries.find(entry => entry.id === id)

  if (!current || !current.image || current.image === nextImage) {
    return []
  }

  return [{ image: current.image }]
}
