/**
 * Authentication Service
 * Handles Google Sign-In and user session management
 */

import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    isAnonymous: boolean;
}

/**
 * Convert Firebase User to AppUser
 */
function toAppUser(user: User): AppUser {
    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        isAnonymous: user.isAnonymous,
    };
}

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<AppUser | null> {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('[Auth] Google sign-in successful:', result.user.displayName);
        return toAppUser(result.user);
    } catch (error: any) {
        // If popup blocked, try redirect
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            console.log('[Auth] Popup blocked, trying redirect...');
            await signInWithRedirect(auth, googleProvider);
            return null;
        }
        console.error('[Auth] Google sign-in error:', error);
        throw error;
    }
}

/**
 * Handle redirect result (call on app load)
 */
export async function handleRedirectResult(): Promise<AppUser | null> {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            console.log('[Auth] Redirect sign-in successful:', result.user.displayName);
            return toAppUser(result.user);
        }
        return null;
    } catch (error) {
        console.error('[Auth] Redirect result error:', error);
        return null;
    }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
    try {
        await firebaseSignOut(auth);
        console.log('[Auth] User signed out');
    } catch (error) {
        console.error('[Auth] Sign out error:', error);
        throw error;
    }
}

/**
 * Get current user
 */
export function getCurrentUser(): AppUser | null {
    const user = auth.currentUser;
    return user ? toAppUser(user) : null;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
        callback(user ? toAppUser(user) : null);
    });
}
