import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { createLikeNotification } from './notifications'

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
