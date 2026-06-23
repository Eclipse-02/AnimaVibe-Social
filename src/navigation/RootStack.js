import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import AuthStack from './AuthStack'
import MainTabs from './MainTabs'
import StoryScreen from '../screens/story/StoryScreen'
import ArchivedStoryScreen from '../screens/story/ArchivedStoryScreen'
import CommentsScreen from '../screens/comments/CommentsScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'
import EditProfileScreen from '../screens/profile/EditProfileScreen'
import PostGridScreen from '../screens/profile/PostGridScreen'
import PostDetailScreen from '../screens/feed/PostDetailScreen'
import CreateStoryScreen from '../screens/story/CreateStoryScreen'
import { useAuthStore } from '../store/authStore'
import { useInitializeAuth } from '../hooks/useInitializeAuth'
import { useThemeColors } from '../hooks/useTheme'

const Stack = createNativeStackNavigator()

export default function RootStack() {
  useInitializeAuth()

  const isHydrated = useAuthStore((state) => state.isHydrated)
  const user = useAuthStore((state) => state.user)
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])

  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    )
  }

  const isLoggedIn = user !== null

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen name="MainApp" component={MainTabs} />
          <Stack.Screen
            name="StoryScreen"
            component={StoryScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="ArchivedStoryScreen"
            component={ArchivedStoryScreen}
            options={{ animation: 'fade' }}
          />
          <Stack.Screen name="Comments" component={CommentsScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ animation: 'fade', animationDuration: 220 }}
          />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="PostGrid" component={PostGridScreen} />
          <Stack.Screen name="CreateStoryScreen" component={CreateStoryScreen} options={{ presentation: 'modal' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  )
}

const getStyles = (colors) => StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
