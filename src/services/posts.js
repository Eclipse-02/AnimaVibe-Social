import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { createLikeNotification } from './notifications'
import { CACHE_KEYS, getOfflineCache, setOfflineCache } from './offlineCache'

function formatLikesCount(count = 0) {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }

  return String(count)
}

function mapPostDoc(postDoc) {
  const data = postDoc.data()
  const imageUrl = data.imageUrl || data.image || ''
  const userPhoto = data.userPhoto || data.avatar || ''
  const likesCount = data.likesCount || 0

  return {
    id: postDoc.id,
    ...data,
    image: imageUrl,
    imageUrl,
    avatar: userPhoto,
    userPhoto,
    likes: formatLikesCount(likesCount),
    likesCount,
  }
}

function mapFeedDoc(postDoc) {
  const data = postDoc.data()
  const likesCount = data.likesCount || 0

  return {
    id: postDoc.id,
    ...data,
    image: data.imageUrl || data.image || '',
    imageUrl: data.imageUrl || data.image || '',
    avatar: data.userPhoto || data.avatar || '',
    userPhoto: data.userPhoto || data.avatar || '',
    likes: data.likes ?? likesCount,
    likesCount,
    timeAgo: 'Baru saja',
  }
}

/**
 * Subscribes to the feed and emits the last AsyncStorage copy before Firestore.
 * This keeps the native feed usable when the app starts without a connection.
 */
export function subscribeToFeedPosts(onData, onError = console.error) {
  let isActive = true
  let unsubscribeFirestore = null

  async function start() {
    const cachedFeed = await getOfflineCache(CACHE_KEYS.feed)
    const hasCachedFeed = Array.isArray(cachedFeed?.value)
    if (!isActive) return

    if (hasCachedFeed) {
      onData(cachedFeed.value, {
        fromCache: true,
        savedAt: cachedFeed.savedAt,
      })
    }

    const feedQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
    unsubscribeFirestore = onSnapshot(
      feedQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        // The RN Firestore memory cache starts empty. Keep the durable
        // AsyncStorage copy visible until a server snapshot arrives.
        if (snapshot.metadata.fromCache && snapshot.empty && hasCachedFeed) {
          return
        }

        const posts = snapshot.docs
          .filter((postDoc) => postDoc.data().createdAt !== null)
          .map(mapFeedDoc)

        onData(posts, {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        })

        if (!snapshot.metadata.fromCache) {
          setOfflineCache(CACHE_KEYS.feed, posts).catch((error) => {
            console.warn('Failed to persist feed cache:', error)
          })
        }
      },
      onError
    )
  }

  start().catch(onError)

  return () => {
    isActive = false
    unsubscribeFirestore?.()
  }
}

/**
 * Creates a new feed post in Firestore.
 * @param {Object} post Post payload.
 * @returns {Promise<Object>} Created post with generated id.
 */
export async function createPost(post = {}) {
  try {
    if (!post.userId) {
      throw new Error('User id is required to create a post.')
    }

    if (!post.imageUrl && !post.image) {
      throw new Error('Post image url is required.')
    }

    const imageUrl = post.imageUrl || post.image
    const userPhoto = post.userPhoto || post.avatar || ''
    const postData = {
      userId: post.userId,
      username: post.username || 'Anonymous',
      userPhoto,
      avatar: userPhoto,
      imageUrl,
      image: imageUrl,
      caption: post.caption?.trim() || '',
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const postRef = await addDoc(collection(db, 'posts'), postData)

    if (post.userId !== 'anonymous') {
      await updateDoc(doc(db, 'users', post.userId), {
        postsCount: increment(1),
        updatedAt: serverTimestamp(),
      })
    }

    return {
      id: postRef.id,
      ...postData,
    }
  } catch (error) {
    throw new Error(`Failed to create post: ${error.message}`)
  }
}

/**
 * Gets feed posts ordered by newest first with cursor pagination.
 * @param {Object} options Pagination options.
 * @returns {Promise<Object>} Posts, next cursor, and hasMore flag.
 */
export async function getFeedPosts(options = {}) {
  try {
    const pageSize = options.pageSize || 10
    const constraints = [orderBy('createdAt', 'desc'), limit(pageSize)]

    if (options.lastDoc) {
      constraints.splice(1, 0, startAfter(options.lastDoc))
    }

    const feedQuery = query(collection(db, 'posts'), ...constraints)
    const snapshot = await getDocs(feedQuery)
    const posts = snapshot.docs.map(mapPostDoc)
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null

    return {
      posts,
      lastDoc,
      hasMore: snapshot.docs.length === pageSize,
    }
  } catch (error) {
    throw new Error(`Failed to get feed posts: ${error.message}`)
  }
}

/**
 * Likes or unlikes a post for the current user.
 * @param {string} postId Firestore post id.
 * @param {string} userId Firebase Auth user id.
 * @returns {Promise<Object>} Updated like status.
 */
export async function toggleLikePost(postId, userId, actor = {}) {
  try {
    if (!postId || !userId) {
      throw new Error('Post id and user id are required to toggle like.')
    }

    const postRef = doc(db, 'posts', postId)
    let liked = false
    let likesCount = 0
    let postData = null

    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef)

      if (!postSnap.exists()) {
        throw new Error('Post was not found.')
      }

      postData = {
        id: postSnap.id,
        ...postSnap.data(),
      }
      const likedBy = postData.likedBy || []
      const alreadyLiked = likedBy.includes(userId)

      liked = !alreadyLiked
      likesCount = (postData.likesCount || 0) + (liked ? 1 : -1)

      transaction.update(postRef, {
        likedBy: liked ? arrayUnion(userId) : arrayRemove(userId),
        likesCount: increment(liked ? 1 : -1),
        updatedAt: serverTimestamp(),
      })
    })

    if (liked && postData?.userId && postData.userId !== userId) {
      await createLikeNotification(postData, {
        userId,
        username: actor.username || actor.displayName || 'Someone',
        userPhoto: actor.userPhoto || actor.photoURL || actor.avatar || '',
      })
    }

    return {
      liked,
      likesCount,
    }
  } catch (error) {
    throw new Error(`Failed to toggle post like: ${error.message}`)
  }
}
