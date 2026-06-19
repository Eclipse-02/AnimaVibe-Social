import React, { useState, useRef } from 'react'
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params
  const insets = useSafeAreaInsets()

  const [liked, setLiked] = useState(post.isLikedByUser || false)
  const [likeCount, setLikeCount] = useState(post.likesCount || post.likes || 0)

  const lastTap = useRef(0)
  const scaleValue = useRef(new Animated.Value(0)).current

  const triggerLikeAnimation = () => {
    scaleValue.setValue(0)

    Animated.sequence([
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true
      }),
      Animated.delay(300),
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Post</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.userRow}>
        <Image
          source={{ uri: post.avatar || post.userPhoto }}
          style={styles.avatar}
          cachePolicy="disk"
        />

        <Text style={styles.username}>
          {post.username}
        </Text>
      </View>

      <TouchableWithoutFeedback onPress={handleDoubleTap}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: post.imageUrl || post.image }}
            style={styles.postImage}
            contentFit="cover"
            cachePolicy="disk"
          />

          <Animated.View
            style={[
              styles.likeAnimation,
              { transform: [{ scale: scaleValue }] }
            ]}
          >
            <Ionicons name="heart" size={100} color="#ff3b30" />
          </Animated.View>
        </View>
      </TouchableWithoutFeedback>

      <View style={styles.actionsContainer}>
        <View style={styles.actionLeft}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => {
              setLiked(!liked)
              setLikeCount(liked ? likeCount - 1 : likeCount + 1)
            }}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? '#ff3b30' : '#ffffff'}
            />

            <View
              style={[
                styles.pillBadge,
                liked && styles.pillBadgeActive
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  liked && styles.pillTextActive
                ]}
              >
                {likeCount > 999
                  ? (likeCount / 1000).toFixed(1) + 'k'
                  : likeCount}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons
              name="chatbubble-outline"
              size={26}
              color="#ffffff"
            />
            <Text style={styles.actionText}>
              {post.commentsCount || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons
              name="share-social-outline"
              size={26}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity>
          <Ionicons
            name="bookmark-outline"
            size={28}
            color="#d1c4ff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.likes}>
          {likeCount} likes
        </Text>

        <Text style={styles.caption}>
          <Text style={styles.bold}>
            {post.username}{' '}
          </Text>
          {post.caption}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a'
  },
  username: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 12
  },
  imageWrapper: {
    position: 'relative'
  },
  postImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#111111'
  },
  likeAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  pillBadge: {
    backgroundColor: '#262433',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10
  },
  pillBadgeActive: {
    backgroundColor: '#402030'
  },
  pillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  pillTextActive: {
    color: '#ff3b30'
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  content: {
    padding: 16
  },
  likes: {
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8
  },
  caption: {
    color: '#ffffff',
    lineHeight: 22
  },
  bold: {
    fontWeight: 'bold'
  }
})