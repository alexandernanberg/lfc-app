import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerRootComponent } from 'expo'
import * as SplashScreen from 'expo-splash-screen'
import { Suspense, useCallback } from 'react'
import { useColorScheme, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '~/components/auth-context'
import { ThemeProvider } from '~/components/theme-context'
import { fixturesQuery, postsQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { getNavigationTheme, Navigation } from './navigation'

// Keep the native splash screen visible until the persisted session has been
// restored via AuthProvider's Suspense boundary below.
void SplashScreen.preventAutoHideAsync()

void queryClient.prefetchInfiniteQuery(postsQuery)
void queryClient.prefetchQuery(fixturesQuery)

function App() {
  const colorScheme = useColorScheme()
  const navigationTheme = getNavigationTheme(colorScheme)

  // Runs once the restored tree is laid out, i.e. after the session Suspense
  // boundary has resolved. Hiding on layout avoids a blank flash.
  const handleLayout = useCallback(() => {
    void SplashScreen.hideAsync()
  }, [])

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={null}>
            <AuthProvider>
              <View style={{ flex: 1 }} onLayout={handleLayout}>
                <Navigation theme={navigationTheme} />
              </View>
            </AuthProvider>
          </Suspense>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

export default registerRootComponent(App)
