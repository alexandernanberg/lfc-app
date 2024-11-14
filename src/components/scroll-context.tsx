import { useHeaderHeight } from '@react-navigation/elements'
import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'
import { useSharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScrollContext {
  offsetY: number
  scrollY: SharedValue<number>
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
}

const ScrollContext = createContext<ScrollContext | null>(null)

interface ScrollProviderProps {
  children: ReactNode
}

export function ScrollProvider({ children }: ScrollProviderProps) {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()

  const offsetY = -(headerHeight || insets.top)
  const scrollY = useSharedValue(offsetY)

  const context = useMemo<ScrollContext>(
    () => ({
      scrollY,
      offsetY,
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.value = event.nativeEvent.contentOffset.y
      },
    }),
    [scrollY, offsetY],
  )

  return (
    <ScrollContext.Provider value={context}>{children}</ScrollContext.Provider>
  )
}

export function useScrollContext() {
  const context = useContext(ScrollContext)
  if (!context) {
    throw new Error(
      'useScrollContext() can only be used within a <ScrollProvider>.',
    )
  }
  return context
}
