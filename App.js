import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import FeedScreen from './src/FeedScreen'

export default function App() {
  return (
    <SafeAreaProvider>
      <FeedScreen />
    </SafeAreaProvider>
  )
}