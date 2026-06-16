import React, { useState, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, TouchableWithoutFeedback, Animated } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

export default function PostCard({ post }) {
  const [liked, setLiked] = useState(post.isLikedByUser || false)
  const [likeCount, setLikeCount] = useState(post.likes || 0)
  const lastTap = useRef(0)
  const scaleValue = useRef(new Animated.Value(0)).current

  const triggerLikeAnimation = () => {
    scaleValue.setValue(0)
    Animated.sequence([
      Animated.spring(scaleValue, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(scaleValue, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start()

    if (!liked) {
      setLiked(true)
      setLikeCount(prev => prev + 1)
    }
  }

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      triggerLikeAnimation()
    } else {
      lastTap.current = now
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: post.userPhoto }} style={styles.avatar} cachePolicy="disk" />
          <View style={styles.headerInfo}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.time}>{post.timeAgo || '2h ago'}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color="#888888" />
        </TouchableOpacity>
      </View>

      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: post.imageUrl }} 
            style={styles.feedImage} 
            cachePolicy="disk"
            transition={300}
            contentFit="cover"
          />
          <Animated.View style={[styles.likeAnimation, { transform: [{ scale: scaleValue }] }]}>
            <Ionicons name="heart" size={100} color="#ff3b30" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.actionsContainer}>
        <View style={styles.actionLeft}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={28} color={liked ? '#ff3b30' : '#ffffff'} />
            <View style={[styles.pillBadge, liked && styles.pillBadgeActive]}>
              <Text style={[styles.pillText, liked && styles.pillTextActive]}>
                {likeCount > 999 ? (likeCount/1000).toFixed(1) + 'k' : likeCount}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={26} color="#ffffff" />
            <Text style={styles.actionText}>{post.commentsCount || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity>
          <Ionicons name="bookmark-outline" size={28} color="#d1c4ff" />
        </TouchableOpacity>
      </View>

      <View style={styles.captionContainer}>
        <Text style={styles.caption}>
          <Text style={styles.boldUser}>{post.username} </Text>
          {post.caption}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#000000', marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a' },
  headerInfo: { marginLeft: 12 },
  username: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  time: { color: '#888888', fontSize: 12, marginTop: 2 },
  imageWrapper: { paddingHorizontal: 16, position: 'relative' },
  feedImage: { width: '100%', aspectRatio: 4 / 5, backgroundColor: '#1a1a1a', borderRadius: 16 },
  likeAnimation: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  actionLeft: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  pillBadge: { backgroundColor: '#262433', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginLeft: 10 },
  pillBadgeActive: { backgroundColor: '#402030' },
  pillText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: '#ff3b30' },
  actionText: { color: '#ffffff', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  captionContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  caption: { color: '#ffffff', fontSize: 13, lineHeight: 20 },
  boldUser: { fontWeight: 'bold' }
})