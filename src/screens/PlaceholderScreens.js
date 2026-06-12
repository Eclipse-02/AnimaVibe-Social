import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const ScreenWrapper = ({ name }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name}</Text>
  </View>
)

export const LoginScreen = () => <ScreenWrapper name="Login Screen" />
export const RegisterScreen = () => <ScreenWrapper name="Register Screen" />
export const ForgotPasswordScreen = () => <ScreenWrapper name="Forgot Password Screen" />
export const DiscoveryScreen = () => <ScreenWrapper name="Discovery Screen" />
export const CreatePostScreen = () => <ScreenWrapper name="Create Post Screen" />
export const NotificationsScreen = () => <ScreenWrapper name="Notifications Screen" />
export const PostDetailScreen = () => <ScreenWrapper name="Post Detail Screen" />
export const ProfileScreen = () => <ScreenWrapper name="Profile Screen" />
export const EditProfileScreen = () => <ScreenWrapper name="Edit Profile Screen" />

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000'
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  }
})