// Canvas shortcuts are bound on `window`, so they have to stay out of the way of anything the DM is typing into.
export function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null

  return Boolean(target?.closest('input, textarea, select, button, [contenteditable="true"]'))
}
