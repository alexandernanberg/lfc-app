export function capitalizeFirstLetter(text: string): string {
  return text.length > 0
    ? text[0].toUpperCase() + text.slice(1).toLowerCase()
    : text
}
