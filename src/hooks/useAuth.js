import { useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { registerWithEmail, loginWithEmail, logout as firebaseLogout } from '../lib/firestore/authService'
import { getUserProfile } from '../lib/firestore/users'

export function useAuth() {
  const setUser = useAuthStore((state) => state.setUser)
  const setUserProfile = useAuthStore((state) => state.setUserProfile)
  const setLoading = useAuthStore((state) => state.setLoading)
  const setError = useAuthStore((state) => state.setError)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const register = useCallback(async (email, password, displayName) => {
    setLoading(true)
    setError(null)
    try {
      const user = await registerWithEmail(email, password, displayName)

      const serializableUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        photoURL: user.photoURL || '',
      }
      setUser(serializableUser)

      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
      return { success: true }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during registration.'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [setUser, setUserProfile, setLoading, setError])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const user = await loginWithEmail(email, password)

      const serializableUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      }
      setUser(serializableUser)

      const profile = await getUserProfile(user.uid)
      setUserProfile(profile)
      return { success: true }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during login.'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [setUser, setUserProfile, setLoading, setError])

  const logout = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await firebaseLogout()
      clearAuth()
      return { success: true }
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during logout.'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [clearAuth, setLoading, setError])

  return {
    register,
    login,
    logout,
  }
}
