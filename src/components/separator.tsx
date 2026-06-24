import { StyleSheet, View } from 'react-native'
import { useTheme } from './theme-context'

export function Separator() {
  const theme = useTheme()

  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.borderBaseMuted,
      }}
    />
  )
}
