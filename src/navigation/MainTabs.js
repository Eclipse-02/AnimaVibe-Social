import React from 'react'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FeedStack from './FeedStack'
import ProfileStack from './ProfileStack'
import DiscoveryScreen from '../screens/search/DiscoveryScreen'
import TagResultsScreen from '../screens/feed/TagResultsScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'
import CreatePostScreen from '../screens/feed/CreatePostScreen'
import TagPeopleScreen from '../screens/feed/TagPeopleScreen'
import { useThemeColors } from '../hooks/useTheme'

const Tab = createMaterialTopTabNavigator()
const Stack = createNativeStackNavigator()

function DiscoveryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoveryMain" component={DiscoveryScreen} />
      <Stack.Screen name="TagResults" component={TagResultsScreen} />
    </Stack.Navigator>
  )
}

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
  const colors = useThemeColors()

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 70 + (insets.bottom > 0 ? insets.bottom : 10),
          paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 14,
        },
        tabBarIndicatorStyle: {
          backgroundColor: 'transparent',
        },
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color }) => {
          let iconName
          if (route.name === 'FeedTab') iconName = focused ? 'home' : 'home-outline'
          else if (route.name === 'Discovery') iconName = focused ? 'search' : 'search-outline'
          else if (route.name === 'Create') iconName = focused ? 'add-circle' : 'add-circle-outline'
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline'
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline'
          return <Ionicons name={iconName} size={24} color={color} />
        }
      })}
    >
      <Tab.Screen name="FeedTab" component={FeedStack} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Discovery" component={DiscoveryStack} />
      <Tab.Screen name="Create" component={CreateStack} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  )
}