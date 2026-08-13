import { ActivityIndicator, StyleSheet, View } from 'react-native'

export function ScreenAcitivityIndicator() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator />
    </View>
  )
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
