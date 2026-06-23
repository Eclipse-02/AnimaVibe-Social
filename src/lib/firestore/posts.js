import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  endAt,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  startAt,
  updateDoc,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../../config/firebase'
import { createLikeNotification } from './notifications'
import { CACHE_KEYS, getOfflineCache, setOfflineCache } from './offlineCache'

function getImageMetadata(imageUri) {
  const extensionMatch = String(imageUri).split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
  const rawExtension = extensionMatch?.[1]?.toLowerCase()
  const extension = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(rawExtension)
    ? rawExtension
    : 'jpg'

  return {
    extension,
    contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  }
}

async function uploadPostImage(userId, imageUri) {
  if (/^https?:\/\//i.test(imageUri)) {
    return { imageUrl: imageUri, imagePath: null, storageRef: null }
  }

  const metadata = getImageMetadata(imageUri)
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const imagePath = `posts/${userId}/${uniqueId}.${metadata.extension}`
  const storageRef = ref(storage, imagePath)
  const response = await fetch(imageUri)
  const blob = await response.blob()

  await uploadBytes(storageRef, blob, { contentType: metadata.contentType })

  return {
    imageUrl: await getDownloadURL(storageRef),
    imagePath,
    storageRef,
  }
}

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

function isPostVisible(postDoc) {
  return postDoc.data().createdAt !== null && postDoc.data().archived !== true
}

/**
 * Finds posts by caption prefix using an indexed Firestore query.
 * @param {string} searchTerm Caption prefix.
 * @param {Object} options Search options.
 * @returns {Promise<Object[]>} Matching posts.
 */
export async function searchPosts(searchTerm, options = {}) {
  try {
    const captionPrefix = String(searchTerm || '').trim()
    if (!captionPrefix) return []

    const resultLimit = Math.min(Math.max(options.limit || 20, 1), 50)
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('caption'),
      startAt(captionPrefix),
      endAt(`${captionPrefix}\uf8ff`),
      limit(resultLimit)
    )
    const snapshot = await getDocs(postsQuery)

    return snapshot.docs.map((postDoc) => ({
      ...mapFeedDoc(postDoc),
      type: 'post',
    }))
  } catch (error) {
    throw new Error(`Failed to search posts: ${error.message}`)
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
          .filter(isPostVisible)
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
  let uploadedStorageRef = null

  try {
    if (!post.userId) {
      throw new Error('User id is required to create a post.')
    }

    if (!post.imageUrl && !post.image) {
      throw new Error('Post image url is required.')
    }

    const uploadedImage = await uploadPostImage(
      post.userId,
      post.imageUrl || post.image
    )
    uploadedStorageRef = uploadedImage.storageRef
    const imageUrl = uploadedImage.imageUrl
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
      imagePath: uploadedImage.imagePath,
      caption,
      tags,
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
      bookmarkedBy: [],
      archived: false,
      archivedAt: null,
      archivedBy: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const postRef = doc(collection(db, 'posts'))
    const userRef = doc(db, 'users', post.userId)

    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef)
      if (!userSnapshot.exists()) {
        throw new Error('User profile was not found.')
      }

      const userData = userSnapshot.data()
      const currentPostCount = userData.postCount ?? userData.postsCount ?? 0

      transaction.set(postRef, postData)
      transaction.update(userRef, {
        postCount: currentPostCount + 1,
        updatedAt: serverTimestamp(),
      })
    })

    return {
      id: postRef.id,
      ...postData,
    }
  } catch (error) {
    if (uploadedStorageRef) {
      await deleteObject(uploadedStorageRef).catch(() => {})
    }
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
      if (options.interactionType === 'archived') {
        constraints.unshift(where('archived', '==', true), where('userId', '==', options.userId))
      } else {
        const field = options.interactionType === 'favorites' ? 'likedBy' : 'bookmarkedBy'
        constraints.unshift(where(field, 'array-contains', options.userId))
      }
    }

    if (options.lastDoc) {
      constraints.splice(constraints.length - 1, 0, startAfter(options.lastDoc))
    }

    const feedQuery = query(collection(db, 'posts'), ...constraints)
    const snapshot = await getDocs(feedQuery)
    const posts = snapshot.docs
      .map(mapPostDoc)
      .filter((post) => options.interactionType === 'archived' || post.archived !== true)
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
 * Marks one of the current user's posts as archived.
 * @param {string} postId Firestore post id.
 * @param {string} userId Firebase Auth user id that owns the post.
 * @returns {Promise<{archived: boolean}>} Archive status.
 */
export async function archivePost(postId, userId) {
  try {
    if (!postId || !userId) {
      throw new Error('Post id and user id are required to archive a post.')
    }

    const postRef = doc(db, 'posts', postId)

    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef)

      if (!postSnap.exists()) {
        throw new Error('Post was not found.')
      }

      if (postSnap.data().userId !== userId) {
        throw new Error('Only the owner can archive this post.')
      }

      transaction.update(postRef, {
        archived: true,
        archivedAt: serverTimestamp(),
        archivedBy: userId,
        updatedAt: serverTimestamp(),
      })
    })

    return { archived: true }
  } catch (error) {
    throw new Error(`Failed to archive post: ${error.message}`)
  }
}

/**
 * Deletes one of the current user's posts and removes its uploaded image when possible.
 * @param {string} postId Firestore post id.
 * @param {string} userId Firebase Auth user id that owns the post.
 * @returns {Promise<{deleted: boolean}>} Delete status.
 */
export async function deletePost(postId, userId) {
  try {
    if (!postId || !userId) {
      throw new Error('Post id and user id are required to delete a post.')
    }

    const postRef = doc(db, 'posts', postId)
    const userRef = doc(db, 'users', userId)
    let imagePath = null

    await runTransaction(db, async (transaction) => {
      const postSnap = await transaction.get(postRef)

      if (!postSnap.exists()) {
        throw new Error('Post was not found.')
      }

      const postData = postSnap.data()
      if (postData.userId !== userId) {
        throw new Error('Only the owner can delete this post.')
      }

      imagePath = postData.imagePath || null
      transaction.delete(postRef)
      transaction.update(userRef, {
        postCount: increment(-1),
        updatedAt: serverTimestamp(),
      })
    })

    if (imagePath) {
      await deleteObject(ref(storage, imagePath)).catch((error) => {
        console.warn('Failed to delete post image from storage:', error)
      })
    }

    return { deleted: true }
  } catch (error) {
    throw new Error(`Failed to delete post: ${error.message}`)
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
