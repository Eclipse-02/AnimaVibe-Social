import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedScreen from '../screens/FeedScreen'
import PostDetailScreen from '../screens/PostDetailScreen'

const Stack = createNativeStackNavigator()

export default function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="FeedMain"
        component={FeedScreen}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
      />
    </Stack.Navigator>
  )
}