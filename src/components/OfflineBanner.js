import React from 'react'
import { StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNetworkStore } from '../store/useNetworkStore'

export default function OfflineBanner() {
  const isOffline = useNetworkStore((state) => state.isOffline)
  const isNetworkInitialized = useNetworkStore(
    (state) => state.isNetworkInitialized
  )

  if (!isNetworkInitialized || !isOffline) return null

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>Kamu sedang offline</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#b45309',
    paddingBottom: 7,
    paddingHorizontal: 16,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
})
