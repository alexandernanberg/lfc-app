export function capitalizeFirstLetter(text: string): string {
  return text.length > 0
    ? text[0]!.toUpperCase() + text.slice(1).toLowerCase()
    : text
}

export function titleCase(input: string): string {
  return input
    .toLowerCase()
    .split(/(\s|-)/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}
