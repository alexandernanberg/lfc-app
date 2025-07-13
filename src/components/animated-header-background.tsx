import type { BlurViewProps } from 'expo-blur'
import { BlurView } from 'expo-blur'
import type { Ref } from 'react'
import type { View } from 'react-native'
import { StyleSheet } from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useScrollContext } from './scroll-context'

interface AnimatedHeaderBackgroundProps extends BlurViewProps {
  ref?: Ref<View>
}

function AnimatedHeaderBackground({
  style,
  ref,
  ...props
}: AnimatedHeaderBackgroundProps) {
  const { scrollY, offsetY } = useScrollContext()

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scrollY.value, [0, 20], [0, 1])
    return { opacity }
  })

  return (
    <Animated.View
      ref={ref}
      style={[
        StyleSheet.absoluteFill,
        {
          zIndex: 10,
          height: Math.abs(offsetY),
        },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      <BlurView intensity={100} style={[StyleSheet.absoluteFill]} />
    </Animated.View>
  )
}

export { AnimatedHeaderBackground }
