import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import FeedStack from './FeedStack'
import ProfileStack from './ProfileStack'
import DiscoveryScreen from '../screens/DiscoveryScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import { CreatePostScreen } from '../screens/PlaceholderScreens'

const Tab = createBottomTabNavigator()

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#222222',
          height: 60,
          paddingBottom: 10
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555555',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName
          if (route.name === 'FeedTab') iconName = focused ? 'home' : 'home-outline'
          else if (route.name === 'Discovery') iconName = focused ? 'search' : 'search-outline'
          else if (route.name === 'Create') iconName = focused ? 'add-circle' : 'add-circle-outline'
          else if (route.name === 'Notifications') iconName = focused ? 'heart' : 'heart-outline'
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline'

          return <Ionicons name={iconName} size={size} color={color} />
        }
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Discovery" component={DiscoveryScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  )
}