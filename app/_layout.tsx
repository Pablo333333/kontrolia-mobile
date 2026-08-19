import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/components/useColorScheme';
import { initDatabase } from '@/lib/database';
import { SyncIndicator } from '@/components/SyncIndicator';
import { GlobalErrorBoundary } from '@/components/GlobalErrorBoundary';
import { AuthProvider } from '@/features/auth/context/AuthProvider';
import { logError } from '@/lib/logger';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const queryClient = new QueryClient();

export {
  // Catch any errors thrown by the Layout component.
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

    // Si fuentes o DB se cuelgan en release, no dejar el splash nativo para siempre.
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

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>ERROR CRÍTICO</Text>
        <Text style={styles.errorText}>{initError}</Text>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando Kontrolia...</Text>
        {!dbReady && <Text style={styles.loadingSubtext}>Preparando base de datos...</Text>}
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
});

function RootLayoutNav() {
  const colorScheme = useColorScheme();

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
              title: 'Nuevo Ticket',
              presentation: 'modal',
              headerShown: true
            }} />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}
