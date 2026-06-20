import React from 'react'
import { createDrawerNavigator } from '@react-navigation/drawer'
import ProfileScreen from '../screens/ProfileScreen'
import ProfileDrawerContent from '../components/ProfileDrawerContent'

const Drawer = createDrawerNavigator()

export default function ProfileStack() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false, drawerPosition: 'right' }}
      drawerContent={(props) => <ProfileDrawerContent {...props} />}
    >
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  )
}