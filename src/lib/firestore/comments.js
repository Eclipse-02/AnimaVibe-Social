import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { createCommentNotification } from './notifications'

/**
 * Maps a comment document snapshot into a plain object.
 * @param {import('firebase/firestore').QueryDocumentSnapshot} commentDoc
 * @returns {Object}
 */
function mapCommentDoc(commentDoc) {
  return {
    id: commentDoc.id,
    ...commentDoc.data(),
  }
}

/**
 * Adds a comment to a post or story and increments its comment counter.
 * @param {string} postId Firestore post/story id.
 * @param {{ userId: string, username?: string, userPhoto?: string, avatar?: string, text: string }} comment Comment payload.
 * @param {string} [collectionName='posts'] Parent collection name ('posts' or 'stories').
 * @returns {Promise<Object>} Created comment with generated id.
 */
export async function addComment(postId, comment = {}, collectionName = 'posts') {
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
      likesCount: 0,
      replyCount: 0,
      likedBy: [],
    }

    const commentRef = await addDoc(
      collection(db, collectionName, postId, 'comments'),
      commentData
    )

    await updateDoc(doc(db, collectionName, postId), {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    const postSnap = await getDoc(doc(db, collectionName, postId))

    if (postSnap.exists()) {
      await createCommentNotification(
        {
          id: postSnap.id,
          ...postSnap.data(),
        },
        {
          id: commentRef.id,
          ...commentData,
        }
      )
    }

    return {
      id: commentRef.id,
      ...commentData,
    }
  } catch (error) {
    throw new Error(`Failed to add comment: ${error.message}`)
  }
}

/**
 * Gets comments for a post/story with cursor pagination.
 * @param {string} postId Firestore post/story id.
 * @param {{ pageSize?: number, lastDoc?: import('firebase/firestore').DocumentSnapshot }} [options] Pagination options.
 * @param {string} [collectionName='posts'] Parent collection name ('posts' or 'stories').
 * @returns {Promise<{ comments: Object[], lastDoc: import('firebase/firestore').DocumentSnapshot|null, hasMore: boolean }>}
 */
export async function getComments(postId, options = {}, collectionName = 'posts') {
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
      collection(db, collectionName, postId, 'comments'),
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

/**
 * Likes or unlikes a comment for the current user.
 * @param {string} postId Firestore post/story id.
 * @param {string} commentId Firestore comment id.
 * @param {string} userId Firebase Auth user id.
 * @param {string} [collectionName='posts'] Parent collection name ('posts' or 'stories').
 * @returns {Promise<{ liked: boolean, likesCount: number }>} Updated like status.
 */
export async function toggleLikeComment(postId, commentId, userId, collectionName = 'posts') {
  try {
    if (!postId || !commentId || !userId) {
      throw new Error('Post id, comment id, and user id are required to toggle comment like.')
    }

    const commentRef = doc(db, collectionName, postId, 'comments', commentId)
    let liked = false
    let likesCount = 0

    await runTransaction(db, async (transaction) => {
      const commentSnap = await transaction.get(commentRef)

      if (!commentSnap.exists()) {
        throw new Error('Comment was not found.')
      }

      const commentData = commentSnap.data()
      const likedBy = commentData.likedBy || []
      const alreadyLiked = likedBy.includes(userId)

      liked = !alreadyLiked
      likesCount = (commentData.likesCount || 0) + (liked ? 1 : -1)

      transaction.update(commentRef, {
        likedBy: liked ? arrayUnion(userId) : arrayRemove(userId),
        likesCount: increment(liked ? 1 : -1),
        updatedAt: serverTimestamp(),
      })
    })

    return {
      liked,
      likesCount,
    }
  } catch (error) {
    throw new Error(`Failed to toggle comment like: ${error.message}`)
  }
}

/**
 * Adds a reply to a specific comment.
 * @param {string} postId Firestore post/story id.
 * @param {string} commentId Firestore comment id.
 * @param {{ userId: string, username?: string, userPhoto?: string, avatar?: string, text: string }} reply Reply payload.
 * @param {string} [collectionName='posts'] Parent collection name ('posts' or 'stories').
 * @returns {Promise<Object>} Created reply with generated id.
 */
export async function addReply(postId, commentId, reply = {}, collectionName = 'posts') {
  try {
    if (!postId || !commentId) throw new Error('Post id and comment id are required.')
    if (!reply.userId) throw new Error('User id is required.')
    if (!reply.text?.trim()) throw new Error('Reply text cannot be empty.')

    const replyData = {
      userId: reply.userId,
      username: reply.username || 'Anonymous',
      userPhoto: reply.userPhoto || reply.avatar || '',
      text: reply.text.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likesCount: 0,
      likedBy: [],
    }

    const replyRef = await addDoc(
      collection(db, collectionName, postId, 'comments', commentId, 'replies'),
      replyData
    )

    await updateDoc(doc(db, collectionName, postId), {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    await updateDoc(doc(db, collectionName, postId, 'comments', commentId), {
      replyCount: increment(1),
      updatedAt: serverTimestamp(),
    })

    return {
      id: replyRef.id,
      ...replyData,
    }
  } catch (error) {
    throw new Error(`Failed to add reply: ${error.message}`)
  }
}

/**
 * Fetches replies for a specific comment.
 * @param {string} postId Firestore post/story id.
 * @param {string} commentId Firestore comment id.
 * @param {string} [collectionName='posts'] Parent collection name ('posts' or 'stories').
 * @returns {Promise<Object[]>} Matching reply documents.
 */
export async function getReplies(postId, commentId, collectionName = 'posts') {
  try {
    if (!postId || !commentId) throw new Error('Post id and comment id are required.')

    const repliesQuery = query(
      collection(db, collectionName, postId, 'comments', commentId, 'replies'),
      orderBy('createdAt', 'asc')
    )

    const snapshot = await getDocs(repliesQuery)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  } catch (error) {
    throw new Error(`Failed to get replies: ${error.message}`)
  }
}
