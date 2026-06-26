import { useEffect, useRef } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuthStore } from '../store/authStore'
import { getUserProfile } from '../lib/firestore/users'
import { initFCM, setupNotificationHandler } from '../lib/firestore/notifications'

// Set up the expo-notifications foreground handler once at module load
setupNotificationHandler()

export function useInitializeAuth() {
  const setUser = useAuthStore((state) => state.setUser)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)
  // Holds the FCM teardown function for the current session
  const fcmTeardownRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // ── Tear down FCM listeners from the previous session ───────
      if (fcmTeardownRef.current) {
        fcmTeardownRef.current()
        fcmTeardownRef.current = null
      }

      if (firebaseUser) {
        const serializableUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName:
            firebaseUser.displayName ||
            firebaseUser.providerData[0]?.displayName ||
            '',
          photoURL:
            firebaseUser.photoURL ||
            firebaseUser.providerData[0]?.photoURL ||
            '',
        }
        setUser(serializableUser)

        try {
          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) setUserProfile(profile)
        } catch (err) {
          console.error('[useInitializeAuth] Error fetching user profile:', err)
        }

        // ── Init FCM for this user ─────────────────────────────────
        try {
          const teardown = await initFCM(firebaseUser.uid)
          fcmTeardownRef.current = teardown
        } catch (err) {
          console.error('[useInitializeAuth] FCM init error:', err)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
    })

    return () => {
      unsubscribe()
      fcmTeardownRef.current?.()
    }
  }, [setUser, setUserProfile])
}
