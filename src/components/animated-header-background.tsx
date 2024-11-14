import type { BlurViewProps } from 'expo-blur'
import { BlurView } from 'expo-blur'
import { forwardRef } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useTheme } from '~/components/theme-context'
import { alphaColor } from '~/theme'
import { useScrollContext } from './scroll-context'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AnimatedHeaderBackgroundProps extends BlurViewProps {}

const AnimatedHeaderBackground = forwardRef<
  BlurView,
  AnimatedHeaderBackgroundProps
>(function AnimatedHeaderBackground({ style, ...props }, ref) {
  const theme = useTheme()
  const { scrollY, offsetY } = useScrollContext()

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [offsetY, offsetY + 10], [0, 1])
    return { opacity }
  })

  return (
    <AnimatedBlurView
      ref={ref}
      intensity={100}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 10,
          height: Math.abs(offsetY),
          backgroundColor: alphaColor(theme.backgroundBase, 0.6),
        },
        animatedStyle,
        style,
      ]}
      {...props}
    />
  )
})

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView)

export { AnimatedHeaderBackground }
