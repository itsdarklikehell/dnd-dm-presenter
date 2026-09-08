const IMAGE_REF_PREFIX = 'idb:'

export function imageRefFor(id: string): string {
  return `${IMAGE_REF_PREFIX}${id}`
}

export function isImageRef(value: string): boolean {
  return value.startsWith(IMAGE_REF_PREFIX)
}

export function imageIdFromRef(ref: string): string {
  return ref.slice(IMAGE_REF_PREFIX.length)
}
