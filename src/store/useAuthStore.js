import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // serializable user info: { uid, email, displayName, photoURL }
      userProfile: null, // user profile document from Firestore
      isLoading: false,
      error: null,
      isHydrated: false,

      setUser: (user) => set({ user }),
      setUserProfile: (userProfile) => set({ userProfile }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      
      clearAuth: () => set({ user: null, userProfile: null, error: null }),
    }),
    {
      name: 'animavibe-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        userProfile: state.userProfile,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true)
        }
      },
    }
  )
)
