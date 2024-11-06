import { BlurView } from 'expo-blur'
import { Stack } from 'expo-router'
import { StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '~/components/theme-context'
import { alphaColor } from '~/theme'

export default function Layout() {
  const theme = useTheme()
  return (
    <Stack
      screenOptions={{
        headerTintColor: theme.foregroundAction,
        headerShadowVisible: false,
        headerTransparent: true,
        headerStyle: {
          backgroundColor: alphaColor(theme.backgroundBase, 0.6),
        },
        headerBackground: () => (
          <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        ),
        contentStyle: {
          backgroundColor: theme.backgroundBase,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          header: () => <StatusBarBackground />,
        }}
      />
    </Stack>
  )
}

function StatusBarBackground() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <BlurView
      intensity={100}
      style={[
        StyleSheet.absoluteFill,
        {
          height: insets.top,
          backgroundColor: alphaColor(theme.backgroundBase, 0.6),
        },
      ]}
    />
  )
}
