import {
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
  where,
  getDoc,
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { createLikeNotification, createPostNotification } from './notifications'
import { CACHE_KEYS, getOfflineCache, setOfflineCache } from './offlineCache'

/**
 * Returns a human-readable relative time string from a Firestore Timestamp or Date.
 * @param {import('firebase/firestore').Timestamp|Date|null} timestamp
 * @returns {string}
 */
export function getTimeAgo(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Recently'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

/**
 * Formats a like count number into a compact display string (e.g. 1200 → "1.2K").
 * @param {number} count
 * @returns {string}
 */
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
    timeAgo: getTimeAgo(data.createdAt),
  }
}

function mapFeedDoc(postDoc) {
  const data = postDoc.data()
  const likesCount = data.likesCount || 0
  const userPhoto = data.userPhoto || data.avatar || ''

  return {
    id: postDoc.id,
    ...data,
    image: data.imageUrl || data.image || '',
    imageUrl: data.imageUrl || data.image || '',
    avatar: userPhoto,
    likesCount,
    likedBy: data.likedBy || [],
    bookmarkedBy: data.bookmarkedBy || [],
    commentsCount: data.commentsCount || 0,
    timeAgo: getTimeAgo(data.createdAt),
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
    const caption = post.caption?.trim() || ''

    const tags = []
    const words = caption.split(/(\s+)/)
    words.forEach(word => {
      if (word.startsWith('#') && word.trim().length > 1) {
        tags.push(word.replace('#', '').trim().toLowerCase())
      }
    })

    const postData = {
      userId: post.userId,
      username: post.username || 'Anonymous',
      userPhoto,
      avatar: userPhoto,
      imageUrl,
      image: imageUrl,
      caption,
      tags,
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
      bookmarkedBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const postRef = doc(collection(db, 'posts'))
    const userRef = doc(db, 'users', post.userId)

    await runTransaction(db, async (transaction) => {
      const userSnap = post.userId !== 'anonymous'
        ? await transaction.get(userRef)
        : null

      transaction.set(postRef, postData)

      if (userSnap) {
        const userData = userSnap.exists() ? userSnap.data() : {}
        const currentPostCount = userData.postCount ?? userData.postsCount ?? 0

        transaction.set(userRef, {
          uid: post.userId,
          postCount: currentPostCount + 1,
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }
    })

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

    if (options.interactionType && options.userId) {
      const field = options.interactionType === 'favorites' ? 'likedBy' : 'bookmarkedBy'
      constraints.unshift(where(field, 'array-contains', options.userId))
    }

    if (options.lastDoc) {
      constraints.splice(options.interactionType ? 2 : 1, 0, startAfter(options.lastDoc))
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

/**
 * Bookmarks or unbookmarks a post for the current user.
 * @param {string} postId Firestore post id.
 * @param {string} userId Firebase Auth user id.
 * @returns {Promise<Object>} Updated bookmark status.
 */
export async function toggleBookmarkPost(postId, userId) {
  try {
    if (!postId || !userId) {
      throw new Error('Post id and user id are required to toggle bookmark.')
    }

    const postRef = doc(db, 'posts', postId)
    let bookmarked = false
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
      const bookmarkedBy = postData.bookmarkedBy || []
      const alreadyBookmarked = bookmarkedBy.includes(userId)

      bookmarked = !alreadyBookmarked

      transaction.update(postRef, {
        bookmarkedBy: bookmarked ? arrayUnion(userId) : arrayRemove(userId),
        updatedAt: serverTimestamp(),
      })
    })

    return { bookmarked }
  } catch (error) {
    throw new Error(`Failed to toggle post bookmark: ${error.message}`)
  }
}
