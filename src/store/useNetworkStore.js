import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const useNetworkStore = create(
  persist(
    (set) => ({
      isConnected: null,
      isInternetReachable: null,
      isOffline: false,
      isNetworkInitialized: false,
      lastChangedAt: null,

      setNetworkState: ({ isConnected, isInternetReachable }) => {
        const isOffline = isConnected === false || isInternetReachable === false

        set({
          isConnected,
          isInternetReachable,
          isOffline,
          isNetworkInitialized: true,
          lastChangedAt: Date.now(),
        })
      },
    }),
    {
      name: 'animavibe-network-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOffline: state.isOffline,
        lastChangedAt: state.lastChangedAt,
      }),
    }
  )
)
