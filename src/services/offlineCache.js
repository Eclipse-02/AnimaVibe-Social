import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_PREFIX = 'animavibe-cache:'
const CACHE_VERSION = 1

export const CACHE_KEYS = {
  feed: 'feed',
}

function storageKey(key) {
  return `${CACHE_PREFIX}${key}`
}

export async function setOfflineCache(key, value) {
  const entry = {
    version: CACHE_VERSION,
    savedAt: Date.now(),
    value,
  }

  await AsyncStorage.setItem(storageKey(key), JSON.stringify(entry))
  return entry
}

export async function getOfflineCache(key) {
  try {
    const rawValue = await AsyncStorage.getItem(storageKey(key))
    if (!rawValue) return null

    const entry = JSON.parse(rawValue)
    if (entry.version !== CACHE_VERSION) {
      await AsyncStorage.removeItem(storageKey(key))
      return null
    }

    return entry
  } catch (error) {
    console.warn(`Failed to read offline cache "${key}":`, error)
    return null
  }
}

export async function removeOfflineCache(key) {
  await AsyncStorage.removeItem(storageKey(key))
}
