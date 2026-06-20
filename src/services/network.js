import NetInfo from '@react-native-community/netinfo'
import { useNetworkStore } from '../store/useNetworkStore'

let unsubscribe = null

function updateNetworkState(state) {
  useNetworkStore.getState().setNetworkState({
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  })
}

export function startNetworkListener() {
  if (unsubscribe) return unsubscribe

  unsubscribe = NetInfo.addEventListener(updateNetworkState)

  return () => {
    unsubscribe?.()
    unsubscribe = null
  }
}
