import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Dimensions } from 'react-native'
import { Image } from 'expo-image'
import { addComment, getComments, toggleLikeComment, addReply, getReplies } from '../../lib/firestore/comments'
import { getTimeAgo } from '../../lib/firestore/posts'
import { useAuthStore } from '../../store/authStore'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useThemeColors } from '../../hooks/useTheme'

const { height } = Dimensions.get('window')

export default function CommentsScreen({ route, navigation }) {
  const colors = useThemeColors()
  const styles = React.useMemo(() => getStyles(colors), [colors])
  const { postId } = route.params
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState([])
  const [modalVisible, setModalVisible] = useState(true)

  const [replyingTo, setReplyingTo] = useState(null)
  const [repliesData, setRepliesData] = useState({})
  const [expandedReplies, setExpandedReplies] = useState({})

  const inputRef = useRef(null)

  const storeUser = useAuthStore(state => state.user)
  const userProfile = useAuthStore(state => state.userProfile)
  const currentUid = storeUser?.uid
  const currentUsername = userProfile?.username || storeUser?.displayName || 'Guest'

  const translateY = useSharedValue(0)
  const replyBoxHeight = useSharedValue(0)

  const handleClose = () => {
    setModalVisible(false)
    setTimeout(() => navigation.goBack(), 250)
  }

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY
      }
    })
    .onEnd(() => {
      if (translateY.value > 150) {
        runOnJS(handleClose)()
      } else {
        translateY.value = withSpring(0)
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }))

  const replyBoxStyle = useAnimatedStyle(() => ({
    height: replyBoxHeight.value,
    opacity: replyBoxHeight.value > 0 ? 1 : 0,
    overflow: 'hidden'
  }))

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      presentation: 'transparentModal',
    })
  }, [navigation])

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await getComments(postId)
        setComments(data?.comments || [])
      } catch (error) {
        console.error("Error loading comments:", error)
      }
    }
    if (postId) fetchComments()
  }, [postId])

  useEffect(() => {
    if (replyingTo) {
      replyBoxHeight.value = withSpring(40, { damping: 14 })
    } else {
      replyBoxHeight.value = withTiming(0, { duration: 200 })
    }
  }, [replyingTo])

  const handlePost = async () => {
    if (!comment.trim() || !currentUid) return

    const newCommentData = {
      userId: currentUid,
      username: currentUsername,
      text: comment,
      userPhoto: storeUser?.photoURL || 'https://i.pravatar.cc/100',
      likesCount: 0,
      replyCount: 0,
      likedBy: [],
      createdAt: new Date(),
    }

    const tempId = Date.now().toString()
    const activeReply = replyingTo

    setComment('')
    setReplyingTo(null)

    if (activeReply) {
      setRepliesData(prev => ({
        ...prev,
        [activeReply.commentId]: [...(prev[activeReply.commentId] || []), { id: tempId, ...newCommentData }]
      }))
      setExpandedReplies(prev => ({ ...prev, [activeReply.commentId]: true }))
      setComments(prev => prev.map(c => c.id === activeReply.commentId ? { ...c, replyCount: (c.replyCount || 0) + 1 } : c))

      try {
        const addedReply = await addReply(postId, activeReply.commentId, newCommentData)
        setRepliesData(prev => ({
          ...prev,
          [activeReply.commentId]: prev[activeReply.commentId].map(r => r.id === tempId ? { ...r, id: addedReply.id } : r)
        }))
      } catch (error) {
        console.error("Failed to sync reply:", error)
      }
    } else {
      setComments(prev => [{ id: tempId, ...newCommentData }, ...prev])
      try {
        const addedComment = await addComment(postId, newCommentData)
        setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: addedComment.id } : c))
      } catch (error) {
        console.error("Failed to sync comment:", error)
        setComments(prev => prev.filter(c => c.id !== tempId))
      }
    }
  }

  const handleLike = async (commentId, isLiked) => {
    if (!currentUid) return

    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const wasLiked = c.likedBy?.includes(currentUid) || false
        let newLikedBy = c.likedBy || []
        if (wasLiked) {
          newLikedBy = newLikedBy.filter(id => id !== currentUid)
        } else {
          newLikedBy = [...newLikedBy, currentUid]
        }
        return {
          ...c,
          likedBy: newLikedBy,
          likesCount: (c.likesCount || 0) + (wasLiked ? -1 : 1)
        }
      }
      return c
    }))

    try {
      await toggleLikeComment(postId, commentId, currentUid)
    } catch (error) {
      console.error("Failed to toggle comment like:", error)
    }
  }

  const handleReply = (commentId, username) => {
    setReplyingTo({ commentId, username })
    setComment(`@${username} `)
    inputRef.current?.focus()
  }

  const cancelReply = () => {
    setReplyingTo(null)
    setComment('')
    inputRef.current?.blur()
  }

  const handleTextChange = (text) => {
    if (replyingTo) {
      const mention = `@${replyingTo.username} `
      if (!text.startsWith(mention)) {
        setReplyingTo(null)
        setComment(text.replace(new RegExp(`^@${replyingTo.username}? ?`), ''))
        return
      }
    }
    setComment(text)
  }

  const loadReplies = async (commentId) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies(prev => ({ ...prev, [commentId]: false }))
      return
    }
    try {
      const fetchedReplies = await getReplies(postId, commentId)
      setRepliesData(prev => ({ ...prev, [commentId]: fetchedReplies }))
      setExpandedReplies(prev => ({ ...prev, [commentId]: true }))
    } catch (error) {
      console.error("Failed to load replies", error)
    }
  }

  const renderTextWithMentions = (text, commentIdForReply = null, isInput = false) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((word, index) => {
      if (word.startsWith('@') && word.trim().length > 1) {
        const rawUsername = word.replace('@', '').trim();
        return (
          <Text
            key={index}
            style={{ color: colors.brand }}
            onPress={(!isInput && commentIdForReply) ? () => handleReply(commentIdForReply, rawUsername) : undefined}
            suppressHighlighting={true}
          >
            {word}
          </Text>
        );
      }
      if (word.startsWith('#') && word.trim().length > 1) {
        return (
          <Text
            key={index}
            style={{ color: '#A855F7' }}
            onPress={!isInput ? () => {
              navigation.navigate('MainApp', {
                screen: 'Discovery',
                params: {
                  screen: 'DiscoveryMain',
                  params: { searchQuery: word.trim(), activeTab: 'post' }
                }
              });
            } : undefined}
            suppressHighlighting={true}
          >
            {word}
          </Text>
        );
      }
      return <Text key={index}>{word}</Text>;
    });
  }

  const renderComment = (item, isReply = false, parentCommentId = null) => {
    const isLiked = item.likedBy?.includes(currentUid) || false
    const displayAvatar = item.userId === currentUid
      ? (userProfile?.photoURL || storeUser?.photoURL || item.userPhoto)
      : item.userPhoto;

    const displayName = item.userId === currentUid ? (userProfile?.displayName || userProfile?.username || storeUser?.displayName) : item.username;
    const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

    const targetReplyId = parentCommentId || item.id;

    const handleProfilePress = () => {
      if (item.userId === currentUid) {
        handleClose()
        setTimeout(() => navigation.navigate('ProfileTab'), 250)
      } else {
        navigation.push('ProfileScreen', { userId: item.userId })
      }
    }

    return (
      <View style={[styles.commentRow, isReply && styles.replyRow]} key={item.id}>
        <TouchableOpacity onPress={handleProfilePress}>
          {displayAvatar ? (
            <Image source={{ uri: displayAvatar }} style={isReply ? styles.smallAvatar : styles.avatar} />
          ) : (
            <View style={[isReply ? styles.smallAvatar : styles.avatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceHigh }]}>
              <Text style={{ color: colors.text, fontSize: isReply ? 12 : 16, fontWeight: 'bold' }}>{initial}</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={styles.commentText}>
            <Text style={styles.username} onPress={handleProfilePress}>{item.username} </Text>
            {renderTextWithMentions(item.text, targetReplyId)}
          </Text>
          <View style={styles.actionRow}>
            <Text style={styles.actionSubtext}>{getTimeAgo(item.createdAt) || 'Just now'}</Text>
            {!isReply && (
              <TouchableOpacity onPress={() => handleReply(item.id, item.username)}>
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isReply && item.replyCount > 0 && (
            <TouchableOpacity style={styles.viewRepliesBtn} onPress={() => loadReplies(item.id)}>
              <View style={styles.replyLine} />
              <Text style={styles.viewRepliesText}>
                {expandedReplies[item.id] ? 'Hide replies' : `View ${item.replyCount} more repl${item.replyCount > 1 ? 'ies' : 'y'}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.likeContainer}>
          <TouchableOpacity style={styles.heartIcon} onPress={() => !isReply && handleLike(item.id, isLiked)}>
            <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={14} color={isLiked ? colors.danger : colors.text} />
          </TouchableOpacity>
          {(item.likesCount > 0) && (
            <Text style={styles.commentLikeCount}>{item.likesCount}</Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={handleClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.sheetContainer, animatedStyle]}>
              <View style={styles.handleContainer}>
                <View style={styles.handle} />
                <Text style={styles.headerTitle}>Comments</Text>
              </View>

              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyHeader}>No comments yet</Text>
                    <Text style={styles.emptySub}>Start the conversation</Text>
                  </View>
                )}
                renderItem={({ item }) => (
                  <View>
                    {renderComment(item)}
                    {expandedReplies[item.id] && repliesData[item.id] && (
                      <View>
                        {repliesData[item.id].map(reply => renderComment(reply, true, item.id))}
                      </View>
                    )}
                  </View>
                )}
              />

              <View style={styles.bottomContainer}>
                {/* Replying To Box */}
                <Animated.View style={[styles.replyBox, replyBoxStyle]}>
                  <Text style={styles.replyBoxText}>
                    Replying to <Text style={{ fontWeight: 'bold' }}>{replyingTo?.username}</Text>
                  </Text>
                  <TouchableOpacity onPress={cancelReply}>
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Input Area */}
                <View style={styles.inputWrapper}>
                  {(userProfile?.photoURL || storeUser?.photoURL) ? (
                    <Image source={{ uri: userProfile?.photoURL || storeUser?.photoURL }} style={styles.smallAvatar} />
                  ) : (
                    <View style={[styles.smallAvatar, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>{currentUsername ? currentUsername.charAt(0).toUpperCase() : '?'}</Text>
                    </View>
                  )}
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textMuted}
                    onChangeText={handleTextChange}
                  >
                    {replyingTo && comment.startsWith(`@${replyingTo.username} `) ? (
                      <Text>
                        <Text style={{ color: colors.brand }}>{`@${replyingTo.username} `}</Text>
                        <Text style={{ color: colors.text }}>
                          {renderTextWithMentions(comment.substring(`@${replyingTo.username} `.length), null, true)}
                        </Text>
                      </Text>
                    ) : (
                      <Text style={{ color: colors.text }}>{renderTextWithMentions(comment, null, true)}</Text>
                    )}
                  </TextInput>
                  <TouchableOpacity onPress={handlePost}>
                    <Text style={styles.postBtn}>Post</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  )
}

const getStyles = (colors) => StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  sheetContainer: {
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: height * 0.7,
    justifyContent: 'space-between'
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
    marginBottom: 10
  },
  headerTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: 'bold'
  },
  listPadding: {
    paddingVertical: 16,
    paddingBottom: 40
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20
  },
  replyRow: {
    paddingLeft: 60,
    marginBottom: 15
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10
  },
  content: {
    marginLeft: 12,
    flex: 1
  },
  commentText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  username: {
    fontWeight: 'bold',
    color: colors.text
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 16
  },
  actionSubtext: {
    color: colors.textMuted,
    fontSize: 12
  },
  actionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  likeContainer: {
    alignItems: 'center',
    marginLeft: 10,
    marginTop: 2
  },
  heartIcon: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  commentLikeCount: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  viewRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  replyLine: {
    width: 30,
    height: 1,
    backgroundColor: colors.textSecondary,
    marginRight: 10
  },
  viewRepliesText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600'
  },
  bottomContainer: { backgroundColor: colors.surfaceHigh },
  replyBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceHigh,
    borderTopWidth: 0.5,
    borderColor: colors.border
  },
  replyBoxText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHigh,
    paddingBottom: Platform.OS === 'ios' ? 25 : 16
  },
  input: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 14,
    paddingTop: 10
  },
  postBtn: {
    color: colors.brand,
    marginLeft: 12,
    fontWeight: 'bold'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingHorizontal: 20
  },
  emptyHeader: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14
  }
})