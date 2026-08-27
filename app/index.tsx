import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthProvider';

export default function Index() {
  const { session, isLoading, signOut } = useAuth();
  const [showExit, setShowExit] = useState(false);

  // Si la restauración de sesión se demora, ofrecer Salir para no quedarse colgado.
  useEffect(() => {
    if (!isLoading) {
      setShowExit(false);
      return;
    }
    const t = setTimeout(() => setShowExit(true), 5000);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.brand}>CONECTA</Text>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.hint}>Restaurando sesión...</Text>
        {showExit && (
          <TouchableOpacity style={styles.exitBtn} onPress={() => signOut()}>
            <Text style={styles.exitText}>Salir / Cerrar sesión</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
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
  },
  hint: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  exitBtn: {
    marginTop: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#94a3b8',
  },
  exitText: {
    color: '#475569',
    fontWeight: '600',
  },
});
