import React, { useState, useMemo } from 'react'
import { Modal, Pressable, StyleSheet, View, Text, TouchableOpacity, Share } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withDelay, withTiming, runOnJS } from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { archivePost, deletePost, toggleLikePost, toggleBookmarkPost } from '../lib/firestore/posts'
import { useAuthStore } from '../store/authStore'
import { useThemeColors } from '../hooks/useTheme'
import ConfirmationModal from './ui/ConfirmationModal'
import PhotoViewer from './photo/PhotoViewer'

/**
 * Renders one feed post and owner actions.
 * @param {{ post: Object, onActionToast?: Function }} props
 */
export default function PostCard({ post, onActionToast }) {
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
  const [isMenuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [isActionLoading, setActionLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [isToastVisible, setToastVisible] = useState(false)
  const [viewerVisible, setViewerVisible] = useState(false)
  const menuButtonRef = React.useRef(null)
  const scaleValue = useSharedValue(0)
  const menuProgress = useSharedValue(0)
  const toastProgress = useSharedValue(0)
  const navigation = useNavigation()
  const colors = useThemeColors()
  const styles = useMemo(() => getStyles(colors), [colors])
  const isOwnPost = post.userId === currentUid

  React.useEffect(() => {
    menuProgress.value = withTiming(isMenuOpen ? 1 : 0, { duration: 160 })
  }, [isMenuOpen, menuProgress])

  function triggerLikeAnimation() {
    scaleValue.value = 0
    scaleValue.value = withSequence(
      withSpring(1, { damping: 12, stiffness: 420 }),
      withDelay(80, withTiming(0, { duration: 70 }))
    )

    if (!liked) {
      handleLikePress()
    }
  }

  function openPostDetail() {
    setViewerVisible(true)
  }

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      runOnJS(triggerLikeAnimation)()
    })

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onStart(() => {
      runOnJS(openPostDetail)()
    })

  const imageTap = Gesture.Exclusive(doubleTap, singleTap)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }]
    }
  })

  const menuAnimatedStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * -8 },
      { scale: 0.96 + (menuProgress.value * 0.04) },
    ],
  }))

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: toastProgress.value,
    transform: [{ translateY: (1 - toastProgress.value) * 18 }],
  }))

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

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      setMenuAnchor({ x, y, width, height })
      setMenuOpen(true)
    })
  }

  const closeMenu = () => {
    setMenuOpen(false)
  }

  const onShare = async () => {
    setMenuOpen(false)
    try {
      await Share.share({
        message: `Check out this post by ${post.username}: ${post.caption}`,
      })
    } catch (error) {
      console.log(error.message)
    }
  }

  const showToast = (message) => {
    if (onActionToast) {
      onActionToast(message)
      return
    }

    setToastMessage(message)
    setToastVisible(true)
    toastProgress.value = 0
    toastProgress.value = withTiming(1, { duration: 220 })

    setTimeout(() => {
      toastProgress.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) runOnJS(setToastVisible)(false)
      })
    }, 1800)
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
          showToast('Post archived')
        } catch (error) {
          showToast(error.message)
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
          showToast('Post deleted')
        } catch (error) {
          showToast(error.message)
        } finally {
          setActionLoading(false)
        }
      },
    })
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
            style={{ color: colors.brand }}
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
        <TouchableOpacity
          ref={menuButtonRef}
          style={styles.menuButton}
          onPress={isMenuOpen ? closeMenu : openMenu}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Modal transparent visible={isMenuOpen} animationType="none" statusBarTranslucent onRequestClose={closeMenu}>
        <Pressable style={styles.dropdownDismissLayer} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.dropdownMenu,
              menuAnchor && {
                top: menuAnchor.y + menuAnchor.height + 4,
                right: Math.max(16, 16),
              },
              menuAnimatedStyle,
            ]}
          >
            <TouchableOpacity style={styles.dropdownItem} onPress={onShare}>
              <Ionicons name="share-social-outline" size={18} color={colors.text} />
              <Text style={styles.dropdownText}>Share</Text>
            </TouchableOpacity>

            {isOwnPost && (
              <>
                <TouchableOpacity style={styles.dropdownItem} onPress={handleArchivePress}>
                  <Ionicons name="archive-outline" size={18} color={colors.text} />
                  <Text style={styles.dropdownText}>Archive</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dropdownItem} onPress={handleDeletePress}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  <Text style={[styles.dropdownText, styles.dropdownDangerText]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </Pressable>
      </Modal>

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
            <Ionicons name="heart" size={100} color={colors.danger} />
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

      <Modal transparent visible={isToastVisible} animationType="none" statusBarTranslucent>
        <View pointerEvents="none" style={styles.toastOverlay}>
          <Animated.View style={[styles.toast, toastAnimatedStyle]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        </View>
      </Modal>

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

      <PhotoViewer
        visible={viewerVisible}
        uri={post.imageUrl}
        username={post.username}
        caption={post.caption}
        onClose={() => setViewerVisible(false)}
      />
    </View>
  )
}

const getStyles = (colors) => StyleSheet.create({
  container: { backgroundColor: colors.background, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, position: 'relative', zIndex: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 6, marginRight: -6 },
  dropdownDismissLayer: {
    flex: 1,
    marginTop: 24
  },
  dropdownMenu: {
    position: 'absolute',
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
    zIndex: 20,
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
  dropdownDangerText: { color: colors.danger },
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
  boldUser: { fontWeight: 'bold' },
  toastOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  }
})
