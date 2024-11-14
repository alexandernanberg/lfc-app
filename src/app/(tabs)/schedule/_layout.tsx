import { Stack } from 'expo-router'
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
          backgroundColor: alphaColor(theme.backgroundBase, 0),
        },
        contentStyle: {
          backgroundColor: theme.backgroundBase,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
        }}
      />
    </Stack>
  )
}
