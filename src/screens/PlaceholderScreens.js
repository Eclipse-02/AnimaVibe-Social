import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

const ScreenWrapper = ({ name }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{name}</Text>
  </View>
)

// Sisa halaman yang BELUM dibikinin file aslinya:
export const ForgotPasswordScreen = () => <ScreenWrapper name="Forgot Password Screen" />
export const CreatePostScreen = () => <ScreenWrapper name="Create Post Screen" />
export const PostDetailScreen = () => <ScreenWrapper name="Post Detail Screen" />
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