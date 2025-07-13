import type { ReactNode, Ref } from 'react'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, useColorScheme, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { alphaColor, colors, textStyles } from '~/theme'
import { useTheme } from './theme-context'

interface SegmentedControlsProps {
  segments: string[]
  disabledIndices?: number[]
  onChange: (index: number) => void
  selectedIndex?: number
}

export function SegmentedControl({
  segments,
  disabledIndices: propDisabledIndices,
  onChange,
  selectedIndex = 0,
}: SegmentedControlsProps) {
  const theme = useTheme()
  const colorScheme = useColorScheme() ?? 'light'
  const animatedValue = useSharedValue(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const disabledIndices = new Set(propDisabledIndices)

  const handlePress = (index: number) => {
    onChange(index)
  }

  const segmentWidth = containerWidth / segments.length

  useEffect(() => {
    animatedValue.value = withSpring(segmentWidth * selectedIndex, {
      stiffness: 220,
      damping: 20,
      mass: 0.5,
      overshootClamping: false,
    })
  }, [animatedValue, segmentWidth, selectedIndex])

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    width: `${100 / segments.length}%`,
    transform: [{ translateX: animatedValue.value }],
  }))

  return (
    <View
      style={[styles.root, { backgroundColor: theme.backgroundBaseElevated }]}
    >
      <View
        style={styles.segments}
        onLayout={({ nativeEvent }) => {
          const width = nativeEvent.layout.width
          animatedValue.set(width / segments.length)
          setContainerWidth(width)
        }}
      >
        <Animated.View
          style={[
            styles.segementBackground,
            {
              backgroundColor:
                colorScheme === 'light' ? colors.white : colors.gray800,
            },
            animatedBackgroundStyle,
          ]}
        />
        {segments.map((segment, index) => {
          const disabled = disabledIndices.has(index)
          return (
            <Segment
              key={segment}
              active={selectedIndex === index}
              disabled={disabled}
              onPress={() => !disabled && handlePress(index)}
            >
              {segment}
            </Segment>
          )
        })}
      </View>
    </View>
  )
}

interface SegmentProps {
  children: ReactNode
  active?: boolean
  disabled?: boolean
  onPress: () => void
  ref?: Ref<View>
}

function Segment({ children, active, disabled, ref, ...props }: SegmentProps) {
  const theme = useTheme()

  return (
    <Pressable ref={ref} style={[styles.segment]} {...props}>
      <Animated.Text
        style={[
          styles.segmentText,
          {
            color: disabled ? theme.foregroundBaseMuted : theme.foregroundBase,
            fontWeight: active ? 500 : 400,
          },
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {children}
      </Animated.Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 12,
    padding: 2,
    overflow: 'hidden',
  },
  segments: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  segment: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBlock: 8,
  },
  segmentText: {
    ...textStyles.captionLarge,
    textAlign: 'center',
  },
  segementBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.white,
    borderRadius: 10,
    boxShadow: `0 1px 3px ${alphaColor(colors.black, 0.1)}`,
  },
})
