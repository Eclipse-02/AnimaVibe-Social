import { useState, useRef } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../store/authStore';
import { getUserProfile } from '../lib/firestore/users';
import { initFCM } from '../lib/firestore/notifications';

GoogleSignin.configure({
    webClientId: '864208355889-2972qm34bdfguk9ken2ijmfnvub3vf3o.apps.googleusercontent.com',
});

export function useGoogleAuth() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const setUser = useAuthStore((state) => state.setUser);
    const setUserProfile = useAuthStore((state) => state.setUserProfile);
    const fcmTeardownRef = useRef(null);

    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            setError(null);

            await GoogleSignin.hasPlayServices();
            const signInResult = await GoogleSignin.signIn();

            const idToken = signInResult.data?.idToken;
            if (!idToken) {
                throw new Error('No ID token found!');
            }

            const googleCredential = auth.GoogleAuthProvider.credential(idToken);
            const userCredential = await auth().signInWithCredential(googleCredential);

            const firebaseUser = userCredential.user;
            const serializableUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
            };
            setUser(serializableUser);

            try {
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile) {
                    setUserProfile(profile);
                }
            } catch (err) {
                console.error('[useGoogleAuth] Error fetching user profile:', err);
            }

            // ── Init FCM — delayed to avoid POST_NOTIFICATIONS dialog
            // colliding with the just-dismissed Google picker activity ──
            fcmTeardownRef.current?.();
            const timer = setTimeout(async () => {
                try {
                    const teardown = await initFCM(firebaseUser.uid);
                    fcmTeardownRef.current = teardown;
                } catch (err) {
                    console.error('[useGoogleAuth] FCM init error:', err);
                }
            }, 1500);

            return { success: true, user: serializableUser, fcmTimer: timer };
        } catch (err) {
            console.error('[useGoogleAuth] Google Sign-In Error:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        try {
            setLoading(true);
            if (fcmTeardownRef.current) {
                fcmTeardownRef.current();
                fcmTeardownRef.current = null;
            }
            await GoogleSignin.signOut();
            await auth().signOut();
            setUser(null);
            setUserProfile(null);
        } catch (err) {
            console.error('[useGoogleAuth] Sign-out error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return {
        signInWithGoogle,
        signOut,
        loading,
        error,
    };
}