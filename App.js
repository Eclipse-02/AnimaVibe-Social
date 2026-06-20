import React, { useEffect } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import RootStack from './src/navigation/RootStack'
import OfflineBanner from './src/components/OfflineBanner'
import { startNetworkListener } from './src/services/network'
import 'react-native-gesture-handler';

export default function App() {
  useEffect(() => startNetworkListener(), [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OfflineBanner />
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
