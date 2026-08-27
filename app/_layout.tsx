import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { addNotificationResponseListener, registerForPushNotifications } from '@/features/notifications/push.service';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';

import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase } from '@/lib/database';
import { SyncIndicator } from '@/components/SyncIndicator';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { logError } from '@/lib/logger';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

const queryClient = new QueryClient();

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

SplashScreen.preventAutoHideAsync();

async function hideSplash() {
  try {
    await SplashScreen.hideAsync();
  } catch {
    // Ya oculta o nativa aún no lista
  }
}

async function clearSessionStorage() {
  try {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
  } catch {
    // ignore
  }
}

export default function RootLayout() {
  const [initError, setInitError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    hideSplash();
  }, []);

  return (
    <GlobalErrorBoundary>
      <RootLayoutContent
        initError={initError}
        setInitError={setInitError}
        dbReady={dbReady}
        setDbReady={setDbReady}
      />
    </GlobalErrorBoundary>
  );
}

function RootLayoutContent({
  initError,
  setInitError,
  dbReady,
  setDbReady,
}: {
  initError: string | null;
  setInitError: (err: string | null) => void;
  dbReady: boolean;
  setDbReady: (ready: boolean) => void;
}) {
  const [, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontError) {
      logError(fontError);
    }
  }, [fontError]);

  useEffect(() => {
    let cancelled = false;

    const safety = setTimeout(() => {
      if (!cancelled) {
        setDbReady(true);
        hideSplash();
      }
    }, 4000);

    async function initialize() {
      try {
        await initDatabase();
        if (!cancelled) setDbReady(true);
      } catch (e: any) {
        if (!cancelled) {
          logError(e);
          setInitError(`Error de inicialización: ${e.message || String(e)}`);
          setDbReady(true);
        }
      } finally {
        await hideSplash();
        clearTimeout(safety);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      clearTimeout(safety);
    };
  }, []);

  const handleForceExit = async () => {
    await clearSessionStorage();
    setInitError(null);
    setDbReady(true);
    await hideSplash();
  };

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>ERROR CRÍTICO</Text>
        <Text style={styles.errorText}>{initError}</Text>
        <TouchableOpacity style={styles.exitBtn} onPress={handleForceExit}>
          <Text style={styles.exitBtnText}>Salir y reiniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.brand}>KONTROLIA</Text>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando Kontrolia...</Text>
        <Text style={styles.loadingSubtext}>Preparando base de datos...</Text>
        <TouchableOpacity style={styles.exitBtnOutline} onPress={handleForceExit}>
          <Text style={styles.exitBtnOutlineText}>Salir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <RootLayoutNav />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e3a8a',
    marginBottom: 24,
    letterSpacing: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fee2e2',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#b91c1c',
    textAlign: 'center',
  },
  exitBtn: {
    marginTop: 24,
    backgroundColor: '#991b1b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  exitBtnOutline: {
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  exitBtnOutlineText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    registerForPushNotifications().catch(() => undefined);

    const subscription = addNotificationResponseListener((data) => {
      if (data.entityType === 'TICKET' && data.entityId) {
        router.push(`/tickets/${data.entityId}`);
      }
    });

    return () => subscription.remove();
  }, [router]);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SyncIndicator />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="new-ticket" options={{
              title: 'Nuevo tema de comunicación',
              presentation: 'modal',
              headerShown: true
            }} />
            <Stack.Screen name="smart-document" options={{
              title: 'Redacción inteligente',
              presentation: 'modal',
              headerShown: true,
            }} />
            <Stack.Screen name="team-settings" options={{
              title: 'Configuración',
              presentation: 'modal',
              headerShown: true,
            }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
