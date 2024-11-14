import { Stack } from 'expo-router'
import { TouchableOpacity } from 'react-native'
import SFSymbol from 'sweet-sfsymbols'
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
          title: 'Nyheter',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: '',
          headerRight: ({ tintColor }) => (
            <TouchableOpacity>
              <SFSymbol
                name="square.and.arrow.up"
                weight="light"
                scale="small"
                colors={[tintColor!]}
                size={25}
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  )
}
