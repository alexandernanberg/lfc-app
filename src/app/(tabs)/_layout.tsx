import { BlurView } from 'expo-blur'
import { Tabs } from 'expo-router'
import { StyleSheet } from 'react-native'
import SFSymbol from 'sweet-sfsymbols'
import { useTheme } from '~/components/theme-context'
import { alphaColor } from '~/theme'

export default function Layout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          borderTopColor: theme.borderBase,
          backgroundColor: alphaColor(theme.backgroundBase, 0.6),
        },
        tabBarBackground: () => (
          <BlurView intensity={100} style={StyleSheet.absoluteFill} />
        ),
        tabBarActiveTintColor: theme.foregroundBase,
        tabBarInactiveTintColor: theme.foregroundBaseFaded,
      }}
    >
      <Tabs.Screen
        name="news"
        options={{
          title: 'Nyheter',
          tabBarIcon: ({ color, focused, size }) => {
            const iconName = focused
              ? ('newspaper.fill' as const)
              : ('newspaper' as const)
            return (
              <SFSymbol
                name={iconName}
                weight="regular"
                scale="small"
                colors={[color]}
                size={size}
              />
            )
          },
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Matcher',
          tabBarIcon: ({ color, focused, size }) => {
            const iconName = focused
              ? ('sportscourt.fill' as const)
              : ('sportscourt' as const)
            return (
              <SFSymbol
                name={iconName}
                weight="regular"
                scale="small"
                colors={[color]}
                size={size}
              />
            )
          },
        }}
      />
    </Tabs>
  )
}
