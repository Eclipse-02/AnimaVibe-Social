import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FeedStack from './FeedStack'
import ProfileStack from './ProfileStack'
import DiscoveryScreen from '../screens/DiscoveryScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import CreatePostScreen from '../screens/CreatePostScreen'
import TagPeopleScreen from '../screens/TagPeopleScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

function CreateStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreatePostMain" component={CreatePostScreen} />
      <Stack.Screen name="TagPeople" component={TagPeopleScreen} />
    </Stack.Navigator>
  )
}

export default function MainTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: '#222222',
          height: 70 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 14,
          paddingTop: 8,
        },
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
      <Tab.Screen name="Create" component={CreateStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  )
}