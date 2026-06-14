import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

export async function registerWithEmail(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  )

  const user = userCredential.user

  if (displayName) {
    await updateProfile(user, {
      displayName,
    })
  }

  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    displayName: displayName || '',
    photoURL: user.photoURL || '',
    provider: 'password',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return user
}

export async function loginWithEmail(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  )

  return userCredential.user
}

export async function logout() {
  await signOut(auth)
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function getUserProfile(uid) {
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    return null
  }

  return {
    id: userSnap.id,
    ...userSnap.data(),
  }
}