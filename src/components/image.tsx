import { forwardRef } from 'react'
import { ImageProps, ImageSourcePropType, Image as RNImage } from 'react-native'
import { suspend } from 'suspend-react'

function getUrl(source: ImageSourcePropType): string | null {
  if (typeof source === 'number') {
    return null
  }

  if (Array.isArray(source)) {
    return source[0].uri ?? null
  }

  return source.uri ?? null
}

export const Image = forwardRef<RNImage, ImageProps>(function Image(
  { source, ...props },
  forwardedRef,
) {
  const url = source ? getUrl(source) : null

  suspend(async () => {
    if (url) {
      await RNImage.prefetch(url)
      // await new Promise((res) => setTimeout(res, 2000))
    }
  }, ['image', url])

  return <RNImage ref={forwardedRef} source={source} {...props} />
})
