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

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };