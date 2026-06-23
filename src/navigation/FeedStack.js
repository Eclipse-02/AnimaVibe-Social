import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedScreen from '../screens/feed/FeedScreen'
import PostDetailScreen from '../screens/feed/PostDetailScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'

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
        options={{
          animation: 'fade',
          animationDuration: 220,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  )
}
