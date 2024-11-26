import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'

import { QueryClientProvider } from '@tanstack/react-query'
import { registerRootComponent } from 'expo'
import { useColorScheme } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ThemeProvider } from '~/components/theme-context'
import { fixturesQuery, newsfeedQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'
import { getNavigationTheme, Navigation } from './navigation'

void queryClient.prefetchInfiniteQuery(newsfeedQuery)
void queryClient.prefetchQuery(fixturesQuery)

function App() {
  const colorScheme = useColorScheme()
  const navigationTheme = getNavigationTheme(colorScheme)

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Navigation theme={navigationTheme} />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  )
}

export default registerRootComponent(App)
