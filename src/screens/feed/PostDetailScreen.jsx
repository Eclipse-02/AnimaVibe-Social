import React, { useState, useEffect } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { archivePost, deletePost, toggleLikePost } from '../../lib/firestore/posts'
import { followUser, unfollowUser } from '../../lib/firestore/users'
import { useAuthStore } from '../../store/authStore'
import { useThemeColors } from '../../hooks/useTheme'
import ConfirmationModal from '../../components/ui/ConfirmationModal'

/**
 * Shows a single post from root navigation with follow, owner actions, and tagged caption links.
 * @param {{ route: { params: { post: Object } }, navigation: Object }} props
 */
export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])

  const storeUser = useAuthStore((state) => state.user)
  const userProfile = useAuthStore((state) => state.userProfile)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)
  const currentUid = storeUser?.uid
  const currentUsername = userProfile?.username || storeUser?.displayName
  const isOwnPost = post.userId === currentUid
  const initialFollowing = userProfile?.following?.includes(post.userId) || false

  const initialLiked = Array.isArray(post.likedBy)
    ? post.likedBy.includes(currentUid)
    : false

  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likesCount ?? 0)
  const [isFollowing, setFollowing] = useState(initialFollowing)
  const [isFollowLoading, setFollowLoading] = useState(false)
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [isActionLoading, setActionLoading] = useState(false)

  const imageOpacity = useSharedValue(0)
  const contentOpacity = useSharedValue(0)
  const menuProgress = useSharedValue(0)
  const heartScale = useSharedValue(0)

  useEffect(() => {
    imageOpacity.value = withTiming(1, { duration: 280 })
    contentOpacity.value = withDelay(120, withTiming(1, { duration: 260 }))
  }, [])

  useEffect(() => {
    setFollowing(userProfile?.following?.includes(post.userId) || false)
  }, [post.userId, userProfile?.following])

  useEffect(() => {
    menuProgress.value = withTiming(isMenuOpen ? 1 : 0, { duration: 160 })
  }, [isMenuOpen, menuProgress])

  const heroImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }))

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -8 },
      { scale: 0.96 + (menuProgress.value * 0.04) },
    ],
  }))

  function triggerHeartAnim() {
    heartScale.value = 0
    heartScale.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 200 }),
      withDelay(150, withTiming(0, { duration: 100 }))
    )
    if (!liked) {
      handleLikePress()
    }
  }

  const handleLikePress = async () => {
    if (!currentUid) return
    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1))
    try {
      await toggleLikePost(post.id, currentUid, {
        username: currentUsername,
        photoURL: userProfile?.photoURL || storeUser?.photoURL,
      })
    } catch {
      setLiked(wasLiked)
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1))
    }
  }

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      runOnJS(triggerHeartAnim)()
    })

  const displayLikeCount = likeCount >= 1000
    ? `${(likeCount / 1000).toFixed(1)}k`
    : likeCount

  const onShare = async () => {
    try {
      await Share.share({ message: `Check out this post by ${post.username}: ${post.caption}` })
    } catch { }
  }

  const openRootScreen = (screenName, params) => {
    const tabNavigator = navigation.getParent?.()
    const rootNavigator = tabNavigator?.getParent?.()
    if (rootNavigator) {
      rootNavigator.navigate(screenName, params)
      return
    }

    navigation.navigate(screenName, params)
  }

  const handleProfilePress = () => {
    if (isOwnPost) {
      navigation.navigate('MainApp', { screen: 'ProfileTab' })
      return
    }

    openRootScreen('ProfileScreen', { userId: post.userId })
  }

  const handleFollowToggle = async () => {
    if (!currentUid || !post.userId || isOwnPost || isFollowLoading) return

    const wasFollowing = isFollowing
    setFollowLoading(true)
    setFollowing(!wasFollowing)

    try {
      if (wasFollowing) {
        await unfollowUser(currentUid, post.userId)
        setUserProfile({
          ...(userProfile || {}),
          following: (userProfile?.following || []).filter((id) => id !== post.userId),
          followingCount: Math.max(0, (userProfile?.followingCount || 0) - 1),
        })
      } else {
        await followUser(currentUid, post.userId, {
          username: userProfile?.username || storeUser?.displayName,
          photoURL: userProfile?.photoURL || storeUser?.photoURL,
        })
        setUserProfile({
          ...(userProfile || {}),
          following: [...(userProfile?.following || []), post.userId],
          followingCount: (userProfile?.followingCount || 0) + 1,
        })
      }
    } catch (error) {
      setFollowing(wasFollowing)
      console.error('Failed to toggle follow:', error)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleArchivePress = () => {
    setMenuOpen(false)
    if (!currentUid || !isOwnPost) return

    setConfirmation({
      title: 'Archive Post',
      message: 'Remove this post from your feed and profile grid? You can still find it in Archive.',
      confirmLabel: 'Archive',
      destructive: false,
      iconName: 'archive-outline',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          await archivePost(post.id, currentUid)
          setConfirmation(null)
          navigation.goBack()
        } catch (error) {
          console.error('Failed to archive post:', error)
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const handleDeletePress = () => {
    setMenuOpen(false)
    if (!currentUid || !isOwnPost) return

    setConfirmation({
      title: 'Delete Post',
      message: 'This post will be permanently deleted. This action cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
      iconName: 'trash-outline',
      onConfirm: async () => {
        setActionLoading(true)
        try {
          await deletePost(post.id, currentUid)
          setConfirmation(null)
          navigation.goBack()
        } catch (error) {
          console.error('Failed to delete post:', error)
        } finally {
          setActionLoading(false)
        }
      },
    })
  }

  const renderCaptionText = (text) => {
    if (!text) return null

    return text.split(/(\s+)/).map((word, index) => {
      const cleanWord = word.trim()

      if (cleanWord.startsWith('#') && cleanWord.length > 1) {
        return (
          <Text
            key={`${word}-${index}`}
            style={styles.tagText}
            onPress={() => {
              openRootScreen('MainApp', {
                screen: 'Discovery',
                params: {
                  screen: 'DiscoveryMain',
                  params: { searchQuery: cleanWord, activeTab: 'post' },
                },
              })
            }}
            suppressHighlighting
          >
            {word}
          </Text>
        )
      }

      if (cleanWord.startsWith('@') && cleanWord.length > 1) {
        return (
          <Text
            key={`${word}-${index}`}
            style={styles.tagText}
            onPress={() => {
              openRootScreen('MainApp', {
                screen: 'Discovery',
                params: {
                  screen: 'DiscoveryMain',
                  params: { searchQuery: cleanWord, activeTab: 'account' },
                },
              })
            }}
            suppressHighlighting
          >
            {word}
          </Text>
        )
      }

      return <Text key={`${word}-${index}`}>{word}</Text>
    })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} id="detail-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity onPress={isOwnPost ? () => setMenuOpen(true) : onShare} style={styles.backBtn}>
          <Ionicons name={isOwnPost ? 'ellipsis-horizontal' : 'share-social-outline'} size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isMenuOpen} animationType="none" statusBarTranslucent onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.dropdownLayer} onPress={() => setMenuOpen(false)}>
          <Animated.View style={[styles.dropdownMenu, menuAnimatedStyle]}>
            <TouchableOpacity style={styles.dropdownItem} onPress={handleArchivePress}>
              <Ionicons name="archive-outline" size={18} color={colors.text} />
              <Text style={styles.dropdownText}>Archive</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={handleDeletePress}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.dropdownText, styles.dropdownDangerText]}>Delete</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* User row */}
        <Animated.View style={[styles.userRow, contentStyle]}>
          <TouchableOpacity style={styles.profilePressArea} onPress={handleProfilePress} activeOpacity={0.8}>
            <Image
              source={{ uri: post.avatar || post.userPhoto }}
              style={styles.avatar}
              cachePolicy="disk"
            />
            <View style={styles.userInfo}>
              <Text style={styles.username}>{post.username}</Text>
              {post.timeAgo ? <Text style={styles.timeAgo}>{post.timeAgo}</Text> : null}
            </View>
          </TouchableOpacity>
          {!isOwnPost && (
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={handleFollowToggle}
              disabled={isFollowLoading}
              id="detail-follow-btn"
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Hero image */}
        <GestureDetector gesture={doubleTap}>
          <Animated.View style={[styles.imageWrapper, heroImageStyle]}>
            <Image
              source={{ uri: post.imageUrl || post.image }}
              style={styles.postImage}
              contentFit="cover"
              cachePolicy="disk"
              transition={100}
            />
            {/* Double-tap heart overlay */}
            <Animated.View style={[styles.heartOverlay, heartAnimStyle]} pointerEvents="none">
              <Ionicons name="heart" size={110} color={colors.danger} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        {/* Actions + caption */}
        <Animated.View style={contentStyle}>
          {/* Action bar */}
          <View style={styles.actionsContainer}>
            <View style={styles.actionLeft}>
              {/* Like */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleLikePress}
                id="detail-like-btn"
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={liked ? colors.danger : colors.text}
                />
                <Text style={styles.actionText}>{displayLikeCount}</Text>
              </TouchableOpacity>

              {/* Comment */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('Comments', { postId: post.id })}
                id="detail-comment-btn"
              >
                <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
                <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity id="detail-bookmark-btn">
              <Ionicons name="bookmark-outline" size={28} color={colors.brand} />
            </TouchableOpacity>
          </View>

          {/* Caption */}
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>
              <Text style={styles.bold}>{post.username} </Text>
              {renderCaptionText(post.caption)}
            </Text>
            {post.timeAgo ? (
              <Text style={styles.timestamp}>{post.timeAgo}</Text>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      <ConfirmationModal
        visible={Boolean(confirmation)}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        confirmLabel={confirmation?.confirmLabel}
        destructive={confirmation?.destructive}
        iconName={confirmation?.iconName}
        isLoading={isActionLoading}
        onCancel={() => {
          if (!isActionLoading) setConfirmation(null)
        }}
        onConfirm={() => confirmation?.onConfirm?.()}
      />
    </View>
  )
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profilePressArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceHigh,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  timeAgo: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  followBtnText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '600',
  },
  followingBtn: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
  },
  followingBtnText: {
    color: colors.text,
  },
  dropdownLayer: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 58,
    right: 16,
    minWidth: 150,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.background,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  dropdownDangerText: {
    color: colors.danger,
  },
  imageWrapper: {
    position: 'relative',
    marginHorizontal: 0,
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  caption: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
  },
  tagText: {
    color: colors.brand,
    fontWeight: '700',
  },
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
})
