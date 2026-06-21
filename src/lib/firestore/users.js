import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../../config/firebase'
import { createFollowNotification } from './notifications'

/**
 * Creates or replaces a user profile document in Firestore.
 * @param {string} uid Firebase Auth user id.
 * @param {Object} profile User profile data.
 * @returns {Promise<Object>} Saved user profile payload.
 */
export async function createUserProfile(uid, profile = {}) {
  try {
    if (!uid) {
      throw new Error('User id is required to create a profile.')
    }

    const userProfile = {
      uid,
      email: profile.email || '',
      displayName: profile.displayName || '',
      username: profile.username || profile.displayName || '',
      photoURL: profile.photoURL || '',
      bio: profile.bio || '',
      provider: profile.provider || 'password',
      followers: profile.followers || [],
      following: profile.following || [],
      followersCount: profile.followersCount || 0,
      followingCount: profile.followingCount || 0,
      postsCount: profile.postsCount || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await setDoc(doc(db, 'users', uid), userProfile)
    return userProfile
  } catch (error) {
    throw new Error(`Failed to create user profile: ${error.message}`)
  }
}

/**
 * Gets a user profile by uid.
 * @param {string} uid Firebase Auth user id.
 * @returns {Promise<Object|null>} User profile data or null when missing.
 */
export async function getUserProfile(uid) {
  try {
    if (!uid) {
      throw new Error('User id is required to get a profile.')
    }

    const userSnap = await getDoc(doc(db, 'users', uid))

    if (!userSnap.exists()) {
      return null
    }

    return {
      id: userSnap.id,
      ...userSnap.data(),
    }
  } catch (error) {
    throw new Error(`Failed to get user profile: ${error.message}`)
  }
}

/**
 * Updates an existing user profile.
 * @param {string} uid Firebase Auth user id.
 * @param {Object} updates Profile fields to update.
 * @returns {Promise<Object>} Updated fields.
 */
export async function updateUserProfile(uid, updates = {}) {
  try {
    if (!uid) {
      throw new Error('User id is required to update a profile.')
    }

    const cleanUpdates = { ...updates }
    delete cleanUpdates.uid
    delete cleanUpdates.createdAt

    await updateDoc(doc(db, 'users', uid), {
      ...cleanUpdates,
      updatedAt: serverTimestamp(),
    })

    return cleanUpdates
  } catch (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }
}

/**
 * Follows another user and updates both profile counters atomically.
 * @param {string} currentUserId User who follows.
 * @param {string} targetUserId User being followed.
 * @returns {Promise<Object>} Follow status.
 */
export async function followUser(currentUserId, targetUserId, actor = {}) {
  try {
    if (!currentUserId || !targetUserId) {
      throw new Error('Both user ids are required to follow a user.')
    }

    if (currentUserId === targetUserId) {
      throw new Error('You cannot follow yourself.')
    }

    const currentUserRef = doc(db, 'users', currentUserId)
    const targetUserRef = doc(db, 'users', targetUserId)
    let didFollow = false

    await runTransaction(db, async (transaction) => {
      const currentUserSnap = await transaction.get(currentUserRef)
      const targetUserSnap = await transaction.get(targetUserRef)

      if (!currentUserSnap.exists() || !targetUserSnap.exists()) {
        throw new Error('User profile was not found.')
      }

      const following = currentUserSnap.data().following || []

      if (following.includes(targetUserId)) {
        return
      }

      didFollow = true

      transaction.update(currentUserRef, {
        following: arrayUnion(targetUserId),
        followingCount: increment(1),
        updatedAt: serverTimestamp(),
      })

      transaction.update(targetUserRef, {
        followers: arrayUnion(currentUserId),
        followersCount: increment(1),
        updatedAt: serverTimestamp(),
      })
    })

    if (didFollow) {
      await createFollowNotification(targetUserId, {
        userId: currentUserId,
        username: actor.username || actor.displayName || 'Someone',
        userPhoto: actor.userPhoto || actor.photoURL || actor.avatar || '',
      })
    }

    return { following: true }
  } catch (error) {
    throw new Error(`Failed to follow user: ${error.message}`)
  }
}

/**
 * Unfollows a user and updates both profile counters atomically.
 * @param {string} currentUserId User who unfollows.
 * @param {string} targetUserId User being unfollowed.
 * @returns {Promise<Object>} Follow status.
 */
export async function unfollowUser(currentUserId, targetUserId) {
  try {
    if (!currentUserId || !targetUserId) {
      throw new Error('Both user ids are required to unfollow a user.')
    }

    if (currentUserId === targetUserId) {
      throw new Error('You cannot unfollow yourself.')
    }

    const currentUserRef = doc(db, 'users', currentUserId)
    const targetUserRef = doc(db, 'users', targetUserId)

    await runTransaction(db, async (transaction) => {
      const currentUserSnap = await transaction.get(currentUserRef)
      const targetUserSnap = await transaction.get(targetUserRef)

      if (!currentUserSnap.exists() || !targetUserSnap.exists()) {
        throw new Error('User profile was not found.')
      }

      const following = currentUserSnap.data().following || []

      if (!following.includes(targetUserId)) {
        return
      }

      transaction.update(currentUserRef, {
        following: arrayRemove(targetUserId),
        followingCount: increment(-1),
        updatedAt: serverTimestamp(),
      })

      transaction.update(targetUserRef, {
        followers: arrayRemove(currentUserId),
        followersCount: increment(-1),
        updatedAt: serverTimestamp(),
      })
    })

    return { following: false }
  } catch (error) {
    throw new Error(`Failed to unfollow user: ${error.message}`)
  }
}
