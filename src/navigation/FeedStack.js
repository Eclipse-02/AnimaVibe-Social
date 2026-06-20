import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import FeedScreen from '../screens/FeedScreen'
import PostDetailScreen from '../screens/PostDetailScreen'
import InboxScreen from '../screens/InboxScreen'
import ChatScreen from '../screens/ChatScreen'
import NotificationsScreen from '../screens/NotificationsScreen'

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
      <Stack.Screen
        name="InboxScreen"
        component={InboxScreen}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </Stack.Navigator>
  )
}