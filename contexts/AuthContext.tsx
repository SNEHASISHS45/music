/**
 * Authentication Context
 * Provides auth state to the entire app
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    AppUser,
    signInWithGoogle,
    signOut,
    onAuthChange,
    handleRedirectResult
} from '../services/authService';

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    error: string | null;
    signIn: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Handle redirect result on load
        handleRedirectResult().then((redirectUser) => {
            if (redirectUser) {
                setUser(redirectUser);
            }
        });

        // Subscribe to auth state changes
        const unsubscribe = onAuthChange((authUser) => {
            setUser(authUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        setError(null);
        setLoading(true);
        try {
            const authUser = await signInWithGoogle();
            if (authUser) {
                setUser(authUser);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
            console.error('[AuthContext] Sign in error:', err);
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await signOut();
            setUser(null);
        } catch (err: any) {
            setError(err.message || 'Failed to sign out');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, signIn, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
