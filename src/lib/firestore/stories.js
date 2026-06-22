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
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../../config/firebase'
import { createStoryNotification, createLikeNotification } from './notifications'

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000

function getMediaMetadata(mediaUrl, requestedType) {
  const extensionMatch = String(mediaUrl).split('?')[0].match(/\.([a-zA-Z0-9]+)$/)
  const rawExtension = extensionMatch?.[1]?.toLowerCase()
  const isVideo = requestedType === 'video' || ['mp4', 'mov', 'm4v', 'webm'].includes(rawExtension)

  return {
    mediaType: isVideo ? 'video' : 'image',
    extension: rawExtension || (isVideo ? 'mp4' : 'jpg'),
    contentType: isVideo ? `video/${rawExtension === 'mov' ? 'quicktime' : rawExtension || 'mp4'}` : `image/${rawExtension === 'jpg' ? 'jpeg' : rawExtension || 'jpeg'}`,
  }
}

async function uploadStoryMedia(userId, mediaUrl, requestedType) {
  if (/^https?:\/\//i.test(mediaUrl)) {
    return {
      mediaUrl,
      mediaPath: null,
      mediaType: requestedType || 'image',
      storageRef: null,
    }
  }

  const metadata = getMediaMetadata(mediaUrl, requestedType)
  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const mediaPath = `stories/${userId}/${uniqueId}.${metadata.extension}`
  const storageRef = ref(storage, mediaPath)
  const response = await fetch(mediaUrl)
  const blob = await response.blob()

  await uploadBytes(storageRef, blob, { contentType: metadata.contentType })

  return {
    mediaUrl: await getDownloadURL(storageRef),
    mediaPath,
    mediaType: metadata.mediaType,
    storageRef,
  }
}

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
  let uploadedStorageRef = null

  try {
    if (!story.userId) {
      throw new Error('User id is required to create a story.')
    }

    if (!story.mediaUrl) {
      throw new Error('Story media url is required.')
    }

    const uploadedMedia = await uploadStoryMedia(
      story.userId,
      story.mediaUrl,
      story.mediaType
    )
    uploadedStorageRef = uploadedMedia.storageRef

    const expiresAt = Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS)
    const storyData = {
      userId: story.userId,
      username: story.username || 'Anonymous',
      userPhoto: story.userPhoto || story.avatar || '',
      mediaUrl: uploadedMedia.mediaUrl,
      mediaPath: uploadedMedia.mediaPath,
      mediaType: uploadedMedia.mediaType,
      caption: story.caption?.trim() || '',
      viewers: [],
      likedBy: [],
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      expiresAt,
    }

    const storyRef = await addDoc(collection(db, 'stories'), storyData)

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
    if (uploadedStorageRef) {
      await deleteObject(uploadedStorageRef).catch(() => {})
    }
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
    const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 100)
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
  const pageSize = Math.min(Math.max(options.pageSize || 20, 1), 100)
  const storiesQuery = query(
    collection(db, 'stories'),
    where('expiresAt', '>', Timestamp.now()),
    orderBy('expiresAt', 'asc'),
    limit(pageSize)
  )

  let expirationTimer = null
  let latestStories = []

  function emitActiveStories() {
    if (expirationTimer) clearTimeout(expirationTimer)

    const now = Date.now()
    const activeStories = latestStories.filter((story) => {
      const expirationTime = story.expiresAt?.toMillis?.() || 0
      return expirationTime > now
    })

    if (callback) callback(activeStories)

    const nextExpiration = activeStories.reduce((earliest, story) => {
      const expirationTime = story.expiresAt.toMillis()
      return Math.min(earliest, expirationTime)
    }, Infinity)

    if (Number.isFinite(nextExpiration)) {
      expirationTimer = setTimeout(
        emitActiveStories,
        Math.max(nextExpiration - Date.now() + 50, 50)
      )
    }
  }

  const unsubscribeSnapshot = onSnapshot(
    storiesQuery,
    (snapshot) => {
      latestStories = snapshot.docs.map(mapStoryDoc)
      emitActiveStories()
    },
    (error) => {
      if (onError) onError(error)
    }
  )

  return () => {
    if (expirationTimer) clearTimeout(expirationTimer)
    unsubscribeSnapshot()
  }
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
