import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuthStore } from '../store/useAuthStore'
import { getUserProfile } from '../services/users'

export function useInitializeAuth() {
  const setUser = useAuthStore((state) => state.setUser)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const serializableUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
        }
        setUser(serializableUser)

        try {
          const profile = await getUserProfile(firebaseUser.uid)
          if (profile) {
            setUserProfile(profile)
          }
        } catch (err) {
          console.error('[useInitializeAuth] Error fetching user profile:', err)
        }
      } else {
        setUser(null)
        setUserProfile(null)
      }
    })

    return unsubscribe
  }, [setUser, setUserProfile])
}
