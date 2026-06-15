import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../config/firebase'

function mapCommentDoc(commentDoc) {
  return {
    id: commentDoc.id,
    ...commentDoc.data(),
  }
}

/**
 * Adds a comment to a post and increments its comment counter.
 * @param {string} postId Firestore post id.
 * @param {Object} comment Comment payload.
 * @returns {Promise<Object>} Created comment with generated id.
 */
export async function addComment(postId, comment = {}) {
  try {
    if (!postId) {
      throw new Error('Post id is required to add a comment.')
    }

    if (!comment.userId) {
      throw new Error('User id is required to add a comment.')
    }

    if (!comment.text?.trim()) {
      throw new Error('Comment text cannot be empty.')
    }

    const commentData = {
      userId: comment.userId,
      username: comment.username || 'Anonymous',
      userPhoto: comment.userPhoto || comment.avatar || '',
      text: comment.text.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const commentRef = await addDoc(
      collection(db, 'posts', postId, 'comments'),
      commentData
    )

    await updateDoc(doc(db, 'posts', postId), {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    return {
      id: commentRef.id,
      ...commentData,
    }
  } catch (error) {
    throw new Error(`Failed to add comment: ${error.message}`)
  }
}

/**
 * Gets comments for a post with cursor pagination.
 * @param {string} postId Firestore post id.
 * @param {Object} options Pagination options.
 * @returns {Promise<Object>} Comments, next cursor, and hasMore flag.
 */
export async function getComments(postId, options = {}) {
  try {
    if (!postId) {
      throw new Error('Post id is required to get comments.')
    }

    const pageSize = options.pageSize || 20
    const constraints = [orderBy('createdAt', 'asc'), limit(pageSize)]

    if (options.lastDoc) {
      constraints.splice(1, 0, startAfter(options.lastDoc))
    }

    const commentsQuery = query(
      collection(db, 'posts', postId, 'comments'),
      ...constraints
    )
    const snapshot = await getDocs(commentsQuery)
    const comments = snapshot.docs.map(mapCommentDoc)
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null

    return {
      comments,
      lastDoc,
      hasMore: snapshot.docs.length === pageSize,
    }
  } catch (error) {
    throw new Error(`Failed to get comments: ${error.message}`)
  }
}
