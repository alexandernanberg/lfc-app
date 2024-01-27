import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: '#fff',
        headerTransparent: true,
        headerBlurEffect: 'regular',
        headerStyle: {
          backgroundColor: '#a91c30',
        },
      }}
    >
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  )
}
