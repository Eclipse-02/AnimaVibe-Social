import { useCallback } from 'react'
import { getOfflineCache, removeOfflineCache, setOfflineCache } from '../lib/firestore/offlineCache'
import { useNetworkStore } from '../store/networkStore'

export function useOfflineCache(cacheKey) {
  const isOffline = useNetworkStore((state) => state.isOffline)
  const isNetworkInitialized = useNetworkStore((state) => state.isNetworkInitialized)

  const readCache = useCallback(
    () => getOfflineCache(cacheKey),
    [cacheKey]
  )
  const writeCache = useCallback(
    (value) => setOfflineCache(cacheKey, value),
    [cacheKey]
  )
  const clearCache = useCallback(
    () => removeOfflineCache(cacheKey),
    [cacheKey]
  )

  return {
    isOffline,
    isNetworkInitialized,
    readCache,
    writeCache,
    clearCache,
  }
}
