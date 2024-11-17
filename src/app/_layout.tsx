import 'react-native-url-polyfill/auto'

import { QueryClientProvider } from '@tanstack/react-query'
import { Slot } from 'expo-router'
import { ThemeProvider } from '~/components/theme-context'
import { fixturesQuery, newsfeedQuery } from '~/lib/queries'
import { queryClient } from '~/lib/query-client'

void queryClient.prefetchInfiniteQuery(newsfeedQuery)
void queryClient.prefetchQuery(fixturesQuery)

export default function Layout() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
