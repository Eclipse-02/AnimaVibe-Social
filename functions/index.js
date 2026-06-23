const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { onSchedule } = require('firebase-functions/v2/scheduler')
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

/**
 * Removes expired story documents and their Storage objects. The client query
 * hides expired stories immediately; this job handles permanent cleanup.
 */
exports.cleanupExpiredStories = onSchedule('every 60 minutes', async () => {
  const snapshot = await db
    .collection('stories')
    .where('expiresAt', '<=', admin.firestore.Timestamp.now())
    .limit(400)
    .get()

  if (snapshot.empty) {
    logger.info('No expired stories to clean up.')
    return
  }

  const bucket = admin.storage().bucket()
  const cleanupResults = await Promise.all(
    snapshot.docs.map(async (storyDoc) => {
      const { mediaPath, userId } = storyDoc.data()

      // Never let a client-supplied path make this privileged function delete
      // files outside that story owner's folder.
      if (!mediaPath || !mediaPath.startsWith(`stories/${userId}/`)) {
        return { storyDoc, canDeleteDocument: true, mediaDeleted: false }
      }

      try {
        await bucket.file(mediaPath).delete()
        return { storyDoc, canDeleteDocument: true, mediaDeleted: true }
      } catch (error) {
        if (error.code === 404) {
          return { storyDoc, canDeleteDocument: true, mediaDeleted: false }
        }

        logger.error('Failed to delete expired story media.', {
          storyId: storyDoc.id,
          mediaPath,
          error: error.message,
        })
        return { storyDoc, canDeleteDocument: false, mediaDeleted: false }
      }
    })
  )

  const batch = db.batch()
  const removableStories = cleanupResults.filter(
    ({ canDeleteDocument }) => canDeleteDocument
  )
  removableStories.forEach(({ storyDoc }) => batch.delete(storyDoc.ref))

  if (removableStories.length > 0) {
    await batch.commit()
  }

  logger.info('Expired stories cleaned up.', {
    storyCount: removableStories.length,
    mediaCount: cleanupResults.filter(({ mediaDeleted }) => mediaDeleted).length,
    retryCount: snapshot.size - removableStories.length,
  })
})
