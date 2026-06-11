import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getReactNativePersistence,
  getAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA0oQSqfPpkLBeXEbeli9e_QYIBwLNdKwE",
  authDomain: "animavibe-social.firebaseapp.com",
  projectId: "animavibe-social",
  storageBucket: "animavibe-social.firebasestorage.app",
  messagingSenderId: "213934092562",
  appId: "1:213934092562:web:6cafc7a72f411b40b043cb"
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

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };