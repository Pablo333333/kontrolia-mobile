import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';

interface AuthContextType {
  session: string | null;
  user: any | null;
  isLoading: boolean;
  signIn: (token: string, user: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`SecureStore timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const token = await withTimeout(SecureStore.getItemAsync('token'), 3000);
        const userData = await withTimeout(SecureStore.getItemAsync('user'), 3000);

        if (!cancelled && token) {
          setSession(token);
          if (userData) setUser(JSON.parse(userData));
        }
      } catch (e) {
        console.error('[AuthProvider] Error loading session:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isLoginPage = segments[0] === 'login';

    if (!session && !isLoginPage) {
      router.replace('/login');
    } else if (session && (isLoginPage || (!inAuthGroup && segments[0] !== 'new-ticket'))) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  const signIn = async (token: string, userData: any) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setSession(token);
    setUser(userData);
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setSession(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
