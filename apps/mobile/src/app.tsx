import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import type { ParamListBase } from '@react-navigation/native'
import { createNavigationContainerRef } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { registerRootComponent } from 'expo'
import * as Notifications from 'expo-notifications'
import * as SplashScreen from 'expo-splash-screen'
import { Suspense, useCallback, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '~/components/auth-context'
import { ThemeProvider } from '~/components/theme-context'
import {
  disableNewPostNotifications,
  enableNewPostNotifications,
  getNewPostNotificationsEnabled,
  getPostIdFromResponse,
} from '~/lib/notifications'
import { fixturesQuery, postsQuery, standingQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { getNavigationTheme, Navigation } from './navigation'

// Keep the native splash screen visible until the persisted session has been
// restored (AuthProvider's Suspense boundary) and the navigation tree has
// finished mounting (Navigation's onReady) — see handleReady below.
void SplashScreen.preventAutoHideAsync()

void queryClient.prefetchInfiniteQuery(postsQuery)
void queryClient.prefetchQuery(fixturesQuery)
void queryClient.prefetchQuery(standingQuery)

// Held at module scope so notification handlers (which fire outside the React
// tree) can drive navigation once the container is ready.
// Typed to ParamListBase to match the ref the static `Navigation` component
// expects; the concrete route names are still passed correctly in openPost.
const navigationRef = createNavigationContainerRef<ParamListBase>()

function openPost(postId: string) {
  if (!navigationRef.isReady()) {
    return
  }
  navigationRef.navigate('Home', {
    screen: 'Newsfeed',
    params: { screen: 'Post', params: { id: postId } },
  })
}

function App() {
  const colorScheme = useColorScheme()
  const navigationTheme = getNavigationTheme(colorScheme)

  useEffect(() => {
    // Apply the saved preference (defaults to on): register this device's
    // push token, or ensure it's torn down if the user turned it off.
    void getNewPostNotificationsEnabled().then((enabled) => {
      if (enabled) {
        void enableNewPostNotifications()
      } else {
        void disableNewPostNotifications()
      }
    })

    // Tapped while the app is running or backgrounded.
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const postId = getPostIdFromResponse(response)
        if (postId) {
          openPost(postId)
        }
      },
    )

    return () => {
      responseSub.remove()
    }
  }, [])

  // Fires once the navigation container and its children have finished mounting,
  // i.e. after the session Suspense boundary resolved and the first screen is
  // actually painted. Hiding here avoids lifting the splash onto a blank frame.
  const handleReady = useCallback(() => {
    void SplashScreen.hideAsync()

    // Cold start: the app was launched by tapping a notification. Navigate now
    // that the container is ready.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const postId = response ? getPostIdFromResponse(response) : null
      if (postId) {
        openPost(postId)
      }
    })
  }, [])

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={null}>
            <AuthProvider>
              <Navigation
                ref={navigationRef}
                theme={navigationTheme}
                onReady={handleReady}
              />
            </AuthProvider>
          </Suspense>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

export default registerRootComponent(App)
