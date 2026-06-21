import React, { useState, useMemo } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Share } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withDelay, withTiming, runOnJS } from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { toggleLikePost, toggleBookmarkPost } from '../lib/firestore/posts'
import { useAuthStore } from '../store/authStore'
import { useThemeColors } from '../hooks/useTheme'

export default function PostCard({ post }) {
  const storeUser = useAuthStore((state) => state.user)
  const userProfile = useAuthStore((state) => state.userProfile)
  const currentUid = storeUser?.uid
  const currentUsername = userProfile?.username || storeUser?.displayName

  const initialLiked = Array.isArray(post.likedBy)
    ? post.likedBy.includes(currentUid)
    : false

  const initialBookmarked = Array.isArray(post.bookmarkedBy)
    ? post.bookmarkedBy.includes(currentUid)
    : false

  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(post.likesCount ?? 0)
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const scaleValue = useSharedValue(0)
  const navigation = useNavigation()
  const colors = useThemeColors()
  const styles = useMemo(() => getStyles(colors), [colors])

  const triggerLikeAnimation = () => {
    scaleValue.value = 0
    scaleValue.value = withSequence(
      withSpring(1, { damping: 9, stiffness: 200 }),
      withDelay(150, withTiming(0, { duration: 100 }))
    )

    if (!liked) {
      handleLikePress()
    }
  }

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      runOnJS(triggerLikeAnimation)()
    })

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      runOnJS(navigation.navigate)('PostDetail', { post })
    })

  const imageTap = Gesture.Exclusive(doubleTap, singleTap)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }]
    }
  })

  const handleLikePress = async () => {
    if (!currentUid) return

    const wasLiked = liked
    setLiked(!wasLiked)
    setLikeCount(prev => wasLiked ? prev - 1 : prev + 1)

    try {
      await toggleLikePost(post.id, currentUid, {
        username: currentUsername,
        photoURL: userProfile?.photoURL || storeUser?.photoURL,
      })
    } catch (error) {
      setLiked(wasLiked)
      setLikeCount(prev => wasLiked ? prev + 1 : prev - 1)
      console.error('Failed to toggle like:', error)
    }
  }

  const handleBookmarkPress = async () => {
    if (!currentUid) return

    const wasBookmarked = bookmarked
    setBookmarked(!wasBookmarked)

    try {
      await toggleBookmarkPost(post.id, currentUid)
    } catch (error) {
      setBookmarked(wasBookmarked)
      console.error('Failed to toggle bookmark:', error)
    }
  }

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out this post by ${post.username}: ${post.caption}`,
      })
    } catch (error) {
      console.log(error.message)
    }
  }

  const displayLikeCount = likeCount >= 1000
    ? `${(likeCount / 1000).toFixed(1)}k`
    : likeCount

  const displayAvatar = post.userId === currentUid
    ? (userProfile?.photoURL || storeUser?.photoURL || post.userPhoto)
    : post.userPhoto;

  const handleProfilePress = () => {
    if (post.userId === currentUid) {
      navigation.navigate('ProfileTab')
    } else {
      navigation.push('ProfileScreen', { userId: post.userId })
    }
  }

  const renderCaptionWithHashtags = (text) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('#') && word.trim().length > 1) {
        return (
          <Text
            key={index}
            style={{ color: '#A855F7' }}
            onPress={() => {
              navigation.navigate('MainApp', {
                screen: 'Discovery',
                params: {
                  screen: 'DiscoveryMain',
                  params: { searchQuery: word.trim(), activeTab: 'post' }
                }
              });
            }}
            suppressHighlighting={true}
          >
            {word}
          </Text>
        );
      }
      return <Text key={index}>{word}</Text>;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={handleProfilePress}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} cachePolicy="disk" />
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.time}>{post.timeAgo || ''}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={imageTap}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.feedImage}
            cachePolicy="disk"
            transition={300}
            contentFit="cover"
          />
          <Animated.View style={[styles.likeAnimation, animatedStyle]}>
            <Ionicons name="heart" size={100} color="#ff3b30" />
          </Animated.View>
        </View>
      </GestureDetector>

      <View style={styles.actionsContainer}>
        <View style={styles.actionLeft}>
          {/* Like button */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleLikePress}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? colors.danger : colors.text} />
            <Text style={styles.actionText}>{displayLikeCount}</Text>
          </TouchableOpacity>

          {/* Comment button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Comments', { postId: post.id })}
          >
            <Ionicons name="chatbubble-outline" size={26} color={colors.text} />
            <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
            <Ionicons name="share-social-outline" size={26} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleBookmarkPress}>
          <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={28} color={bookmarked ? colors.brand : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.boldUser}>{post.username} </Text>
          {renderCaptionWithHashtags(post.caption)}
        </Text>
      </View>
    </View>
  )
}

const getStyles = (colors) => StyleSheet.create({
  container: { backgroundColor: colors.background, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceHigh },
  headerInfo: { marginLeft: 12 },
  username: { color: colors.text, fontWeight: 'bold', fontSize: 14 },
  time: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  imageWrapper: { paddingHorizontal: 16, position: 'relative' },
  feedImage: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.surfaceHigh, borderRadius: 16 },
  likeAnimation: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  actionText: { color: colors.text, fontSize: 14, fontWeight: '600', marginLeft: 8 },
  captionContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  caption: { color: colors.text, fontSize: 13, lineHeight: 20 },
  boldUser: { fontWeight: 'bold' }
})