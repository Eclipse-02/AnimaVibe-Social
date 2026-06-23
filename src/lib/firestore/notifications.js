import { Platform } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import * as ExpoNotifications from 'expo-notifications'
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../config/firebase'

const NOTIFICATIONS_COLLECTION = 'notifications'

/**
 * Builds a URL-safe document id for a device token.
 * @param {string} token Raw push token.
 * @returns {string}
 */
function getTokenDocId(token) {
  return encodeURIComponent(token)
}

/**
 * Builds a default human-readable message for a notification type.
 * @param {string} type Notification type ('like', 'comment', 'follow', ...).
 * @param {string} [actorName='Someone'] Display name of the acting user.
 * @returns {string}
 */
function buildNotificationMessage(type, actorName = 'Someone') {
  if (type === 'like') {
    return `${actorName} liked your post.`
  }

  if (type === 'comment') {
    return `${actorName} commented on your post.`
  }

  if (type === 'follow') {
    return `${actorName} started following you.`
  }

  return 'You have a new notification.'
}

/**
 * Installs the global expo-notifications handler that controls how
 * incoming notifications are presented while the app is foregrounded.
 */
export function setupNotificationHandler() {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

/**
 * Schedules a local notification that fires immediately.
 * @param {{ title?: string, body?: string, message?: string, type?: string, actorName?: string, data?: Object }} notification Local notification payload.
 * @returns {Promise<string>} Scheduled notification id.
 */
export async function scheduleLocalNotification(notification = {}) {
  const title = notification.title || 'AnimaVibe'
  const body =
    notification.body ||
    notification.message ||
    buildNotificationMessage(notification.type, notification.actorName)

  return ExpoNotifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: notification.data || {},
    },
    trigger: null,
  })
}

/**
 * Requests notification permission, obtains the device push token and
 * persists it under the user's profile for later FCM delivery.
 * @param {string} userId Firebase Auth user id.
 * @returns {Promise<string>} Registered push token.
 */
export async function registerDeviceForPushNotifications(userId) {
  try {
    if (!userId) {
      throw new Error('User id is required to register a device token.')
    }

    if (Platform.OS === 'android') {
      await ExpoNotifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: ExpoNotifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a855f7',
      })
    }

    const existingPermissions =
      await ExpoNotifications.getPermissionsAsync()
    let finalStatus = existingPermissions.status

    if (existingPermissions.status !== 'granted') {
      const requestedPermissions =
        await ExpoNotifications.requestPermissionsAsync()
      finalStatus = requestedPermissions.status
    }

    if (finalStatus !== 'granted') {
      throw new Error('Notification permission was not granted.')
    }

    const tokenResponse = await ExpoNotifications.getDevicePushTokenAsync()

    await saveDeviceToken(userId, {
      token: tokenResponse.data,
      provider: tokenResponse.type || 'fcm',
      platform: Platform.OS,
    })

    return tokenResponse.data
  } catch (error) {
    throw new Error(`Failed to register push notifications: ${error.message}`)
  }
}

/**
 * Persists (or merges) a device token under the user's profile so the server can target pushes.
 * @param {string} userId Firebase Auth user id.
 * @param {{ token: string, provider?: string, platform?: string }} device Device descriptor.
 * @returns {Promise<Object>} Stored token payload.
 */
export async function saveDeviceToken(userId, device = {}) {
  try {
    if (!userId || !device.token) {
      throw new Error('User id and device token are required.')
    }

    const tokenRef = doc(
      db,
      'users',
      userId,
      'deviceTokens',
      getTokenDocId(device.token)
    )

    const tokenData = {
      token: device.token,
      provider: device.provider || 'fcm',
      platform: device.platform || Platform.OS,
      enabled: true,
      updatedAt: serverTimestamp(),
    }

    await setDoc(tokenRef, tokenData, { merge: true })
    return tokenData
  } catch (error) {
    throw new Error(`Failed to save device token: ${error.message}`)
  }
}

/**
 * Marks a previously registered device token as disabled.
 * @param {string} userId Firebase Auth user id.
 * @param {string} token Push token to disable.
 * @returns {Promise<void>}
 */
export async function disableDeviceToken(userId, token) {
  try {
    if (!userId || !token) {
      throw new Error('User id and device token are required.')
    }

    await updateDoc(
      doc(db, 'users', userId, 'deviceTokens', getTokenDocId(token)),
      {
        enabled: false,
        updatedAt: serverTimestamp(),
      }
    )
  } catch (error) {
    throw new Error(`Failed to disable device token: ${error.message}`)
  }
}

/**
 * Creates a notification document and skips self-notifications
 * (when recipient and actor are the same user).
 * @param {{ recipientId: string, actorId?: string, actorName?: string, actorPhoto?: string, type: string, entityType?: string, entityId?: string, postId?: string, commentId?: string, message?: string }} notification Notification payload.
 * @returns {Promise<Object|null>} Created notification, or null when it would target the actor.
 */
export async function createNotification(notification = {}) {
  try {
    if (!notification.recipientId) {
      throw new Error('Recipient id is required to create a notification.')
    }

    if (!notification.type) {
      throw new Error('Notification type is required.')
    }

    if (notification.recipientId === notification.actorId) {
      return null
    }

    const notificationData = {
      recipientId: notification.recipientId,
      actorId: notification.actorId || '',
      actorName: notification.actorName || 'Someone',
      actorPhoto: notification.actorPhoto || '',
      type: notification.type,
      entityType: notification.entityType || '',
      entityId: notification.entityId || '',
      postId: notification.postId || '',
      commentId: notification.commentId || '',
      message:
        notification.message ||
        buildNotificationMessage(notification.type, notification.actorName),
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const notificationRef = await addDoc(
      collection(db, NOTIFICATIONS_COLLECTION),
      notificationData
    )

    return {
      id: notificationRef.id,
      ...notificationData,
    }
  } catch (error) {
    throw new Error(`Failed to create notification: ${error.message}`)
  }
}

/**
 * Builds and persists a 'like' notification for the post owner.
 * @param {{ id: string, userId: string }} post Liked post.
 * @param {{ userId: string, username?: string, userPhoto?: string }} actor Acting user.
 * @returns {Promise<Object|null>}
 */
export function createLikeNotification(post, actor = {}) {
  return createNotification({
    recipientId: post.userId,
    actorId: actor.userId,
    actorName: actor.username,
    actorPhoto: actor.userPhoto,
    type: 'like',
    entityType: 'post',
    entityId: post.id,
    postId: post.id,
  })
}

/**
 * Builds and persists a 'comment' notification for the post owner.
 * @param {{ id: string, userId: string }} post Commented post.
 * @param {{ id: string, userId: string, username?: string, userPhoto?: string }} comment Comment that was added.
 * @returns {Promise<Object|null>}
 */
export function createCommentNotification(post, comment = {}) {
  return createNotification({
    recipientId: post.userId,
    actorId: comment.userId,
    actorName: comment.username,
    actorPhoto: comment.userPhoto,
    type: 'comment',
    entityType: 'post',
    entityId: post.id,
    postId: post.id,
    commentId: comment.id,
  })
}

/**
 * Builds and persists a 'follow' notification for the followed user.
 * @param {string} targetUserId User being followed (notification recipient).
 * @param {{ userId: string, username?: string, userPhoto?: string }} actor Acting user.
 * @returns {Promise<Object|null>}
 */
export function createFollowNotification(targetUserId, actor = {}) {
  return createNotification({
    recipientId: targetUserId,
    actorId: actor.userId,
    actorName: actor.username,
    actorPhoto: actor.userPhoto,
    type: 'follow',
    entityType: 'user',
    entityId: actor.userId,
  })
}

/**
 * Gets notifications for a recipient with cursor pagination.
 * @param {string} userId Recipient user id.
 * @param {{ pageSize?: number, lastDoc?: import('firebase/firestore').DocumentSnapshot }} [options] Pagination options.
 * @returns {Promise<{ notifications: Object[], lastDoc: import('firebase/firestore').DocumentSnapshot|null, hasMore: boolean }>}
 */
export async function getNotifications(userId, options = {}) {
  try {
    if (!userId) {
      throw new Error('User id is required to get notifications.')
    }

    const pageSize = options.pageSize || 20
    const constraints = [
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ]

    if (options.lastDoc) {
      constraints.splice(2, 0, startAfter(options.lastDoc))
    }

    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      ...constraints
    )
    const snapshot = await getDocs(notificationsQuery)
    const notifications = snapshot.docs.map((notificationDoc) => ({
      id: notificationDoc.id,
      ...notificationDoc.data(),
    }))
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null

    return {
      notifications,
      lastDoc,
      hasMore: snapshot.docs.length === pageSize,
    }
  } catch (error) {
    throw new Error(`Failed to get notifications: ${error.message}`)
  }
}

export function listenToNotifications(userId, callback, options = {}) {
  if (!userId) {
    throw new Error('User id is required to listen to notifications.')
  }

  const notificationsQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(options.pageSize || 30)
  )

  return onSnapshot(notificationsQuery, (snapshot) => {
    callback(
      snapshot.docs.map((notificationDoc) => ({
        id: notificationDoc.id,
        ...notificationDoc.data(),
      }))
    )
  })
}

export async function getUnreadNotificationsCount(userId) {
  try {
    if (!userId) {
      throw new Error('User id is required to get unread notifications count.')
    }

    const unreadQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('recipientId', '==', userId),
      where('read', '==', false)
    )
    const snapshot = await getCountFromServer(unreadQuery)

    return snapshot.data().count
  } catch (error) {
    throw new Error(`Failed to get unread notifications count: ${error.message}`)
  }
}

export function listenToUnreadNotificationsCount(userId, callback) {
  if (!userId) {
    throw new Error('User id is required to listen to unread count.')
  }

  const unreadQuery = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('recipientId', '==', userId),
    where('read', '==', false)
  )

  return onSnapshot(unreadQuery, (snapshot) => {
    callback(snapshot.size)
  })
}

export async function markNotificationAsRead(notificationId) {
  try {
    if (!notificationId) {
      throw new Error('Notification id is required.')
    }

    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId), {
      read: true,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    throw new Error(`Failed to mark notification as read: ${error.message}`)
  }
}

export async function markAllNotificationsAsRead(userId) {
  try {
    if (!userId) {
      throw new Error('User id is required.')
    }

    const unreadQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('recipientId', '==', userId),
      where('read', '==', false),
      limit(500)
    )
    const snapshot = await getDocs(unreadQuery)
    const batch = writeBatch(db)

    snapshot.docs.forEach((notificationDoc) => {
      batch.update(notificationDoc.ref, {
        read: true,
        updatedAt: serverTimestamp(),
      })
    })

    await batch.commit()

    return snapshot.docs.length
  } catch (error) {
    throw new Error(`Failed to mark all notifications as read: ${error.message}`)
  }
}

export async function createPostNotification(post, followers = [], actor = {}) {
  try {
    if (!followers || followers.length === 0) return;

    for (let i = 0; i < followers.length; i += 500) {
      const chunk = followers.slice(i, i + 500);
      const batch = writeBatch(db);
      
      chunk.forEach(followerId => {
        if (followerId === post.userId) return;

        const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
        const notificationData = {
          recipientId: followerId,
          actorId: post.userId,
          actorName: actor.username || 'Someone',
          actorPhoto: actor.userPhoto || '',
          type: 'new_post',
          entityType: 'post',
          entityId: post.id,
          postId: post.id,
          message: `${actor.username || 'Someone'} shared a new post.`,
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(notificationRef, notificationData);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Failed to create post notifications:', error);
  }
}

export async function createStoryNotification(story, followers = [], actor = {}) {
  try {
    if (!followers || followers.length === 0) return;

    for (let i = 0; i < followers.length; i += 500) {
      const chunk = followers.slice(i, i + 500);
      const batch = writeBatch(db);
      
      chunk.forEach(followerId => {
        if (followerId === story.userId) return;

        const notificationRef = doc(collection(db, NOTIFICATIONS_COLLECTION));
        const notificationData = {
          recipientId: followerId,
          actorId: story.userId,
          actorName: actor.username || 'Someone',
          actorPhoto: actor.userPhoto || '',
          type: 'new_story',
          entityType: 'story',
          entityId: story.id,
          storyId: story.id,
          message: `${actor.username || 'Someone'} added a new story.`,
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(notificationRef, notificationData);
      });
      await batch.commit();
    }
  } catch (error) {
    console.error('Failed to create story notifications:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FCM lifecycle — call once per sign-in, call the returned teardown on sign-out
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialises FCM for the signed-in user:
 *  1. Requests notification permission (Android 13+ / iOS)
 *  2. Gets the FCM registration token and saves it to Firestore
 *  3. Subscribes to foreground messages → shows a local notification
 *  4. Subscribes to token-refresh events to keep Firestore up to date
 *
 * @param {string} userId   Firebase Auth uid of the signed-in user.
 * @param {Function} [onNotificationOpen]  Optional callback fired when the user
 *        taps a notification while the app is backgrounded. Receives the
 *        RemoteMessage object.
 * @returns {() => void} Teardown function — call it on sign-out.
 */
export async function initFCM(userId, onNotificationOpen) {
  if (!userId) return () => {}

  const cleanups = []

  try {
    let authStatus
    try {
      authStatus = await messaging().requestPermission()
    } catch (err) {
      // If this throws with "SERVICE_NOT_FOUND" / "null is not an object",
      // the @react-native-firebase native module isn't linked into the build.
      console.error('[FCM] requestPermission() threw:', err?.code || err?.message || err)
      return () => {}
    }

    console.log('[FCM] Permission status:', authStatus)
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (!enabled) {
      console.warn('[FCM] Notification permission not granted — getToken skipped.')
      return () => {}
    }

    if (Platform.OS === 'android') {
      await ExpoNotifications.setNotificationChannelAsync('default', {
        name: 'AnimaVibe',
        importance: ExpoNotifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#a855f7',
      })
    }

    let token
    try {
      token = await messaging().getToken()
    } catch (err) {
      // This is the line that decides whether a push can ever be delivered.
      // Common codes: SERVICE_NOT_FOUND (Firebase not initialised natively),
      // INVALID_SENDER, or a network/runtime error.
      console.error('[FCM] getToken() FAILED:', err?.code || err?.message || err)
      return () => {}
    }

    if (token) {
      try {
        await saveDeviceToken(userId, {
          token,
          provider: 'fcm',
          platform: Platform.OS,
        })
        console.log('[FCM] Token saved to Firestore for user', userId)
      } catch (err) {
        console.error('[FCM] saveDeviceToken() FAILED:', err?.message || err)
      }
    }

    const unsubRefresh = messaging().onTokenRefresh(async (newToken) => {
      await saveDeviceToken(userId, {
        token: newToken,
        provider: 'fcm',
        platform: Platform.OS,
      }).catch(err => console.warn('[FCM] Could not save refreshed token:', err))
    })
    cleanups.push(unsubRefresh)

    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      const { notification, data } = remoteMessage
      if (!notification) return

      await scheduleLocalNotification({
        title: notification.title || 'AnimaVibe',
        body: notification.body || '',
        data: data || {},
      }).catch(err => console.warn('[FCM] Could not show local notification:', err))
    })
    cleanups.push(unsubForeground)

    if (typeof onNotificationOpen === 'function') {
      // App opened from background by tapping a notification
      const unsubBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
        if (remoteMessage) onNotificationOpen(remoteMessage)
      })
      cleanups.push(unsubBackground)

      // App launched from quit state by tapping a notification
      const initialMessage = await messaging().getInitialNotification()
      if (initialMessage) onNotificationOpen(initialMessage)
    }
  } catch (err) {
    console.error('[FCM] initFCM error:', err)
  }

  return () => cleanups.forEach(fn => fn())
}
