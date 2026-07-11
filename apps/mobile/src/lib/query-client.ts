import { focusManager, QueryClient } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

// onlineManager.setEventListener((setOnline) => {
//   const subscription = Network.addNetworkStateListener((state) => {
//     setOnline(state.isConnected ?? true)
//   })
//   return () => subscription.remove()
// })

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') {
      setFocused(status === 'active')
    }
  })
  return () => subscription.remove()
})

export const queryClient = new QueryClient()
