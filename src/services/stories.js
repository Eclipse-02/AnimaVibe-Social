import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../config/firebase'

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
