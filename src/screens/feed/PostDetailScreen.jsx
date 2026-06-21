import React, { useState, useEffect } from 'react'
import {
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
  Easing,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { toggleLikePost } from '../../lib/firestore/posts'
import { useAuthStore } from '../../store/authStore'
import { useThemeColors } from '../../hooks/useTheme'

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])

  const storeUser = useAuthStore((state) => state.user)
  const userProfile = useAuthStore((state) => state.userProfile)
  const currentUid = storeUser?.uid
  const currentUsername = userProfile?.username || storeUser?.displayName

  const initialLiked = Array.isArray(post.likedBy)
    ? post.likedBy.includes(currentUid)
    : false

  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likesCount ?? 0)

  const imageScale = useSharedValue(0.88)
  const imageOpacity = useSharedValue(0)
  const imageTranslateY = useSharedValue(28)

  const contentOpacity = useSharedValue(0)
  const contentTranslateY = useSharedValue(16)

  const heartScale = useSharedValue(0)

  useEffect(() => {
    imageScale.value = withSpring(1, { damping: 18, stiffness: 120 })
    imageOpacity.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })
    imageTranslateY.value = withSpring(0, { damping: 20, stiffness: 140 })

    contentOpacity.value = withDelay(180, withTiming(1, { duration: 280 }))
    contentTranslateY.value = withDelay(180, withSpring(0, { damping: 20, stiffness: 160 }))
  }, [])

  const heroImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [
      { scale: imageScale.value },
      { translateY: imageTranslateY.value },
    ],
  }))

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }))

  const heartAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }))

  const triggerHeartAnim = () => {
    heartScale.value = 0
    heartScale.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 200 }),
      withDelay(150, withTiming(0, { duration: 100 }))
    )
    if (!liked) {
      runOnJS(handleLikePress)()
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} id="detail-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity onPress={onShare} style={styles.backBtn}>
          <Ionicons name="share-social-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* User row */}
        <Animated.View style={[styles.userRow, contentStyle]}>
          <Image
            source={{ uri: post.avatar || post.userPhoto }}
            style={styles.avatar}
            cachePolicy="disk"
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{post.username}</Text>
            {post.timeAgo ? <Text style={styles.timeAgo}>{post.timeAgo}</Text> : null}
          </View>
          <TouchableOpacity style={styles.followBtn} id="detail-follow-btn">
            <Text style={styles.followBtnText}>Follow</Text>
          </TouchableOpacity>
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
              <Ionicons name="heart" size={110} color="#ff3b30" />
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
              {post.caption}
            </Text>
            {post.timeAgo ? (
              <Text style={styles.timestamp}>{post.timeAgo}</Text>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
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
  timestamp: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
})