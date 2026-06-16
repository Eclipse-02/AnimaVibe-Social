import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AuthStack from './AuthStack'
import MainTabs from './MainTabs'
import { useAuthStore } from '../store/useAuthStore'
import { useInitializeAuth } from '../hooks/useInitializeAuth'

const Stack = createNativeStackNavigator()

export default function RootStack() {
  // Initialize the auth state listener
  useInitializeAuth()

  // Select only the pieces of state we need using granular selectors
  const user = useAuthStore((state) => state.user)
  const isHydrated = useAuthStore((state) => state.isHydrated)

  // Show a dark loading screen while restoring store state from AsyncStorage
  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    )
  }

  const isLoggedIn = !!user

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="MainApp" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
})