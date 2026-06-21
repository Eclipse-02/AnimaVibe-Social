import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  onSnapshot,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { addComment } from './comments'
import { createStoryNotification, createLikeNotification } from './notifications'

function mapStoryDoc(storyDoc) {
  return {
    id: storyDoc.id,
    ...storyDoc.data(),
  }
}

/**
 * Creates a story that expires after 24 hours by default.
 * @param {Object} story Story payload.
 * @returns {Promise<Object>} Created story with generated id.
 */
export async function createStory(story = {}) {
  try {
    if (!story.userId) {
      throw new Error('User id is required to create a story.')
    }

    if (!story.mediaUrl) {
      throw new Error('Story media url is required.')
    }

    const expiresAt =
      story.expiresAt ||
      Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000))
    const storyData = {
      userId: story.userId,
      username: story.username || 'Anonymous',
      userPhoto: story.userPhoto || story.avatar || '',
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType || 'image',
      caption: story.caption?.trim() || '',
      viewers: [],
      createdAt: serverTimestamp(),
      expiresAt,
    }

    const storyRef = await addDoc(collection(db, 'stories'), storyData)

    if (storyData.caption) {
      addComment(storyRef.id, {
        userId: storyData.userId,
        username: storyData.username,
        userPhoto: storyData.userPhoto,
        text: storyData.caption,
      }, 'stories').catch(console.error)
    }

    try {
      const userSnap = await getDoc(doc(db, 'users', storyData.userId));
      if (userSnap.exists()) {
        const followers = userSnap.data().followers || [];
        if (followers.length > 0) {
          createStoryNotification(
            { id: storyRef.id, ...storyData },
            followers,
            { username: storyData.username, userPhoto: storyData.userPhoto }
          ).catch(console.error);
        }
      }
    } catch (err) {
      console.error('Failed to fan-out story notifications:', err);
    }

    return {
      id: storyRef.id,
      ...storyData,
    }
  } catch (error) {
    throw new Error(`Failed to create story: ${error.message}`)
  }
}

/**
 * Gets active stories that have not expired yet.
 * @param {Object} options Query options.
 * @returns {Promise<Array>} Active stories.
 */
export async function getActiveStories(options = {}) {
  try {
    const pageSize = options.pageSize || 20
    const storiesQuery = query(
      collection(db, 'stories'),
      where('expiresAt', '>', Timestamp.now()),
      orderBy('expiresAt', 'asc'),
      limit(pageSize)
    )
    const snapshot = await getDocs(storiesQuery)

    return snapshot.docs.map(mapStoryDoc)
  } catch (error) {
    throw new Error(`Failed to get active stories: ${error.message}`)
  }
}

/**
 * Subscribes to active stories that have not expired yet.
 * @param {Function} callback Callback with active stories.
 * @param {Function} onError Callback for errors.
 * @param {Object} options Query options.
 * @returns {Function} Unsubscribe function.
 */
export function subscribeToActiveStories(callback, onError, options = {}) {
  const pageSize = options.pageSize || 20
  const storiesQuery = query(
    collection(db, 'stories'),
    where('expiresAt', '>', Timestamp.now()),
    orderBy('expiresAt', 'asc'),
    limit(pageSize)
  )

  const unsubscribe = onSnapshot(
    storiesQuery,
    (snapshot) => {
      const stories = snapshot.docs.map(mapStoryDoc)
      if (callback) callback(stories)
    },
    (error) => {
      if (onError) onError(error)
    }
  )

  return unsubscribe
}

/**
 * Likes or unlikes a story for the current user.
 * @param {string} storyId Firestore story id.
 * @param {string} userId Firebase Auth user id.
 * @returns {Promise<Object>} Updated like status.
 */
export async function toggleLikeStory(storyId, userId, actor = {}) {
  try {
    if (!storyId || !userId) {
      throw new Error('Story id and user id are required to toggle like.')
    }

    const storyRef = doc(db, 'stories', storyId)
    let liked = false
    let likesCount = 0
    let storyData = null

    await runTransaction(db, async (transaction) => {
      const storySnap = await transaction.get(storyRef)

      if (!storySnap.exists()) {
        throw new Error('Story was not found.')
      }

      storyData = {
        id: storySnap.id,
        ...storySnap.data(),
      }
      const likedBy = storyData.likedBy || []
      const alreadyLiked = likedBy.includes(userId)

      liked = !alreadyLiked
      likesCount = (storyData.likesCount || 0) + (liked ? 1 : -1)

      transaction.update(storyRef, {
        likedBy: liked ? arrayUnion(userId) : arrayRemove(userId),
        likesCount: increment(liked ? 1 : -1),
        updatedAt: serverTimestamp(),
      })
    })

    if (liked && storyData?.userId && storyData.userId !== userId) {
      await createLikeNotification({ ...storyData, id: storyId, type: 'story' }, {
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
    throw new Error(`Failed to toggle story like: ${error.message}`)
  }
}
