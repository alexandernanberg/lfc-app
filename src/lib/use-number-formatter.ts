const formatterCache = new Map<string, Intl.NumberFormat>()

export function useNumberFormatter(
  locale = 'sv',
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const cacheKey =
    locale +
    (options
      ? Object.entries(options)
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .join()
      : '')

  if (formatterCache.has(cacheKey)) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return formatterCache.get(cacheKey)
  }

  const formatter = new Intl.NumberFormat(locale, options)

  formatterCache.set(cacheKey, formatter)
  return formatter
}
