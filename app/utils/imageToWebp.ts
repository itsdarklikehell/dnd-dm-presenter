export interface ImageEncoding {
  maxDimension: number
  quality: number
}

export const PORTRAIT_IMAGE_ENCODING: ImageEncoding = { maxDimension: 1024, quality: 0.8 }

export async function convertImageFileToWebpBlob(file: File | Blob, { maxDimension, quality }: ImageEncoding): Promise<Blob> {
  const canvas = await drawScaledImage(file, maxDimension)

  return await canvasToWebpBlob(canvas, quality)
}

async function drawScaledImage(file: File | Blob, maxDimension: number): Promise<HTMLCanvasElement> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const img = await loadImage(objectUrl)
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable')
    }

    ctx.drawImage(img, 0, 0, width, height)

    return canvas
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Failed to encode the image as webp')),
      'image/webp',
      quality
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
