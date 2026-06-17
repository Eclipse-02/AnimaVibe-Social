const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { logger } = require('firebase-functions')
const admin = require('firebase-admin')

admin.initializeApp()

const db = admin.firestore()

function stringifyData(data = {}) {
  return Object.entries(data).reduce((payload, [key, value]) => {
    if (value !== undefined && value !== null) {
      payload[key] = String(value)
    }

    return payload
  }, {})
}

async function disableInvalidTokens(recipientId, tokenDocs, responses) {
  const batch = db.batch()
  let invalidCount = 0

  responses.forEach((response, index) => {
    if (response.success) {
      return
    }

    const code = response.error?.code
    const shouldDisable =
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/registration-token-not-registered'

    if (shouldDisable) {
      invalidCount += 1
      batch.update(tokenDocs[index].ref, {
        enabled: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }
  })

  if (invalidCount > 0) {
    await batch.commit()
    logger.info('Disabled invalid FCM tokens.', { recipientId, invalidCount })
  }
}

exports.sendNotificationPush = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    const notification = event.data?.data()

    if (!notification?.recipientId || !notification?.message) {
      logger.warn('Notification payload is missing recipientId or message.', {
        notificationId: event.params.notificationId,
      })
      return
    }

    const tokensSnapshot = await db
      .collection('users')
      .doc(notification.recipientId)
      .collection('deviceTokens')
      .where('enabled', '==', true)
      .get()

    if (tokensSnapshot.empty) {
      logger.info('No enabled FCM tokens for recipient.', {
        recipientId: notification.recipientId,
      })
      return
    }

    const tokenDocs = tokensSnapshot.docs
    const tokens = tokenDocs.map((tokenDoc) => tokenDoc.data().token)
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: 'AnimaVibe',
        body: notification.message,
      },
      data: stringifyData({
        notificationId: event.params.notificationId,
        type: notification.type,
        actorId: notification.actorId,
        entityType: notification.entityType,
        entityId: notification.entityId,
        postId: notification.postId,
        commentId: notification.commentId,
      }),
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    })

    await disableInvalidTokens(
      notification.recipientId,
      tokenDocs,
      response.responses
    )

    logger.info('FCM push notification sent.', {
      notificationId: event.params.notificationId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    })
  }
)
