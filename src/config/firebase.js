import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfVyuy21PNbAqbp25dYZcKvrZXprcwBGM",
  authDomain: "animavibe-social-e32e7.firebaseapp.com",
  projectId: "animavibe-social-e32e7",
  storageBucket: "animavibe-social-e32e7.firebasestorage.app",
  messagingSenderId: "864208355889",
  appId: "1:864208355889:web:dcb3007ca455b5a9a48b10"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

let db;
try {
  // IndexedDB persistence is available on web. React Native uses the
  // AsyncStorage feed cache in services/offlineCache.js instead.
  db = Platform.OS === "web"
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentSingleTabManager(),
        }),
      })
    : initializeFirestore(app);
} catch (error) {
  // Fast Refresh can evaluate this module after Firestore was initialized.
  db = getFirestore(app);
}
const storage = getStorage(app);

export { app, auth, db, storage };
