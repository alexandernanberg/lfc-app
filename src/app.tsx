import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerRootComponent } from 'expo'
import * as SplashScreen from 'expo-splash-screen'
import { Suspense, useCallback } from 'react'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '~/components/auth-context'
import { ThemeProvider } from '~/components/theme-context'
import { fixturesQuery, postsQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { getNavigationTheme, Navigation } from './navigation'

// Keep the native splash screen visible until the persisted session has been
// restored (AuthProvider's Suspense boundary) and the navigation tree has
// finished mounting (Navigation's onReady) — see handleReady below.
void SplashScreen.preventAutoHideAsync()

void queryClient.prefetchInfiniteQuery(postsQuery)
void queryClient.prefetchQuery(fixturesQuery)

function App() {
  const colorScheme = useColorScheme()
  const navigationTheme = getNavigationTheme(colorScheme)

  // Fires once the navigation container and its children have finished mounting,
  // i.e. after the session Suspense boundary resolved and the first screen is
  // actually painted. Hiding here avoids lifting the splash onto a blank frame.
  const handleReady = useCallback(() => {
    void SplashScreen.hideAsync()
  }, [])

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={null}>
            <AuthProvider>
              <Navigation theme={navigationTheme} onReady={handleReady} />
            </AuthProvider>
          </Suspense>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

export default registerRootComponent(App)
