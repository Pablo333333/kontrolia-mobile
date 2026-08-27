import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useSegments } from 'expo-router';
import { AuthUser } from '@/features/auth/utils/roles';
import api from '@/lib/api';

interface AuthContextType {
  session: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (token: string, user: AuthUser) => Promise<void>;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  const signOut = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('user');
    } catch {
      // ignore
    }
    setSession(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const token = await withTimeout(SecureStore.getItemAsync('token'), 3000);
        const userData = await withTimeout(SecureStore.getItemAsync('user'), 3000);

        if (cancelled) return;

        if (!token) {
          setSession(null);
          setUser(null);
          return;
        }

        // Validar token tras días de inactividad (evita sesión zombi).
        try {
          await withTimeout(
            api.get('/catalog/me/preferences', {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 8000,
            }),
            9000,
          );
          setSession(token);
          if (userData) setUser(JSON.parse(userData));
        } catch (err: any) {
          const status = err?.response?.status;
          console.warn('[AuthProvider] Token inválido o red fallida al restaurar:', status || err?.message);
          if (status === 401 || status === 403) {
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('user');
            setSession(null);
            setUser(null);
          } else {
            // Offline / timeout: mantener sesión local para uso offline
            setSession(token);
            if (userData) setUser(JSON.parse(userData));
          }
        }
      } catch (e) {
        console.error('[AuthProvider] Error loading session:', e);
        if (!cancelled) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    // Hard stop: nunca dejar isLoading=true más de 10s
    const hardStop = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, 10000);

    loadSession().finally(() => clearTimeout(hardStop));

    return () => {
      cancelled = true;
      clearTimeout(hardStop);
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isLoginPage = segments[0] === 'login';

    const allowedModalRoutes = ['new-ticket', 'smart-document', 'team-settings'];
    const isAllowedModal = allowedModalRoutes.includes(segments[0] as string);

    if (!session && !isLoginPage) {
      router.replace('/login');
    } else if (session && (isLoginPage || (!inAuthGroup && !isAllowedModal))) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  const signIn = async (token: string, userData: AuthUser) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setSession(token);
    setUser(userData);

    try {
      const { registerForPushNotifications } = await import('@/features/notifications/push.service');
      await registerForPushNotifications();
    } catch (error) {
      console.warn('[AuthProvider] Push registration skipped:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
