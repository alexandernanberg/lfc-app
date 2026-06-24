import { StyleSheet, View } from 'react-native'
import { useTheme } from './theme-context'

export function Separator({ inset = 0 }: { inset?: number }) {
  const theme = useTheme()

  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.borderBaseMuted,
        marginLeft: inset,
      }}
    />
  )
}
