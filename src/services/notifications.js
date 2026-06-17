import { Platform } from 'react-native'
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
import { db } from '../config/firebase'

const NOTIFICATIONS_COLLECTION = 'notifications'

function getTokenDocId(token) {
  return encodeURIComponent(token)
}

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
