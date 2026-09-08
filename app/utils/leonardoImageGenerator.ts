const API_BASE_V1 = 'https://cloud.leonardo.ai/api/rest/v1'
const API_BASE_V2 = 'https://cloud.leonardo.ai/api/rest/v2'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS = 90000
const MIMIC_IMAGE_STYLE_REFERENCE_STRENGTH = 'MID'
const GENERATION_SIZE = 1024
const MODEL = 'flux-pro-2.0'

export type LeonardoImageReference
  = | { type: 'GENERATED', id: string }
    | { type: 'BASE64', dataUri: string }

export const DEFAULT_IMAGE_STYLE_PROMPT = `Highly detailed hand-inked fantasy character illustration,
semi-realistic fantasy concept art, traditional pen-and-ink linework,
strong clean black contour lines with varied line weight,
fine hatching and cross-hatching throughout the shadows,
intricate hand-drawn details,
subtle cel shading combined with soft painterly color transitions,
muted warm earthy color palette, burgundy, dark brown, ivory,
aged gold and bronze metallic accents,
rich material textures for leather, cloth and metal,
sharp expressive facial features,
realistic anatomy with slightly stylized fantasy proportions,
highly detailed medieval fantasy costume,
dramatic but controlled lighting,
crisp illustrated edges,
visible pen texture,
professional tabletop RPG character concept art,
full upper-body portrait,
front-facing or three-quarter pose,
centered composition,
isolated on a clean white background,
no scenery, no frame, no text.`

export interface NpcImagePrompt {
  species: string
  gender: string
  age: string
  role: string
  description: string
  style: string
  mimicImageStyleReference?: LeonardoImageReference
}

export interface GeneratedNpcImage {
  image: string
  leonardoImageId: string
}

export async function generateLeonardoNpcImage(apiKey: string, promptInput: NpcImagePrompt): Promise<GeneratedNpcImage> {
  const prompt = buildPrompt(promptInput)
  const generationId = await startGeneration(apiKey, prompt, promptInput.mimicImageStyleReference ?? null)
  const generatedImage = await pollForGeneratedImage(apiKey, generationId)
  const imageResponse = await fetch(generatedImage.url)

  if (!imageResponse.ok) {
    throw new Error(`Failed to download generated image (${imageResponse.status})`)
  }

  const webp = await convertImageFileToWebpBlob(await imageResponse.blob(), PORTRAIT_IMAGE_ENCODING)

  return { image: await putImageBlob(webp), leonardoImageId: generatedImage.id }
}

function buildPrompt({ species, gender, age, role, description, style }: NpcImagePrompt): string {
  const subject = [age, gender, role].map(part => part.trim()).filter(Boolean).join(' ')
  const base = `Portrait of a ${subject || 'fantasy character'} of ${species} species.`
    + `Style: ${style.trim() || DEFAULT_IMAGE_STYLE_PROMPT}`

  return description.trim() ? `${base}. Character description: ${description.trim()}` : base
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}` }
}

async function startGeneration(
  apiKey: string,
  prompt: string,
  mimicImageStyleReference: LeonardoImageReference | null
): Promise<string> {
  const parameters: Record<string, unknown> = {
    prompt,
    quantity: 1,
    width: GENERATION_SIZE,
    height: GENERATION_SIZE,
    prompt_enhance: 'OFF'
  }

  if (mimicImageStyleReference) {
    const image = mimicImageStyleReference.type === 'BASE64'
      ? { url: mimicImageStyleReference.dataUri, type: 'BASE64' }
      : { id: mimicImageStyleReference.id, type: mimicImageStyleReference.type }

    parameters.guidances = {
      image_reference: [{ image, strength: MIMIC_IMAGE_STYLE_REFERENCE_STRENGTH }]
    }
  }

  const response = await fetch(`${API_BASE_V2}/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(apiKey) },
    body: JSON.stringify({ public: false, model: MODEL, parameters })
  })

  if (!response.ok) {
    throw new Error(`Leonardo API error starting generation (${response.status})`)
  }

  const body = await response.json() as { generate?: { generationId?: string } }
  const generationId = body.generate?.generationId

  if (!generationId) {
    throw new Error('Leonardo API did not return a generation id')
  }

  return generationId
}

interface GenerationStatusResponse {
  generations_by_pk?: {
    status?: string
    generated_images?: { url: string, id: string }[]
  }
}

async function pollForGeneratedImage(apiKey: string, generationId: string): Promise<{ url: string, id: string }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const response = await fetch(`${API_BASE_V1}/generations/${generationId}`, { headers: authHeaders(apiKey) })

    if (!response.ok) {
      throw new Error(`Leonardo API error checking generation status (${response.status})`)
    }

    const body = await response.json() as GenerationStatusResponse
    const generation = body.generations_by_pk

    if (generation?.status === 'COMPLETE') {
      const generatedImage = generation.generated_images?.[0]

      if (!generatedImage?.url || !generatedImage.id) {
        throw new Error('Leonardo API completed generation without an image')
      }

      return generatedImage
    }

    if (generation?.status === 'FAILED') {
      throw new Error('Leonardo image generation failed')
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error('Timed out waiting for Leonardo image generation')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
