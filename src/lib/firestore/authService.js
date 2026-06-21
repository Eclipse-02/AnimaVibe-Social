import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../../config/firebase'
import { createUserProfile, getUserProfile } from './users'

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

  await createUserProfile(user.uid, {
    email: user.email,
    displayName: displayName || '',
    photoURL: user.photoURL || '',
    provider: 'password',
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

export { getUserProfile }
