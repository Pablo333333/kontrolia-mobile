import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTicket, useOpenTicket } from '@/features/tickets/hooks/use-tickets';
import { DocumentoVivo } from '@/components/DocumentoVivo';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const openTicket = useOpenTicket();

  const { data: ticket, isLoading, error } = useTicket(id as string);

  useEffect(() => {
    if (id) {
      openTicket.mutate(id as string);
    }
  }, [id]);

  if (!id) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando mensaje...</Text>
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Error' }} />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorTitle}>Mensaje no encontrado</Text>
          <Text style={styles.errorSubtitle}>El mensaje que buscas no existe o ha sido eliminado.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/tickets/index')}
          >
            <Text style={styles.backBtnText}>Volver a Seguimiento de comunicación</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusName = ticket.statusName || ticket.workflowState?.name || 'N/A';

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Detalle del mensaje',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 8 }}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: getStatusColor(statusName) }]}>
            <Text style={styles.badgeText}>{statusName}</Text>
          </View>
        </View>
        <Text style={styles.title}>{ticket.title || 'Mensaje'}</Text>
        {ticket.description && <Text style={styles.description}>{ticket.description}</Text>}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="account-arrow-right" size={16} color="#6b7280" />
          <Text style={styles.metaText}>
            Para: {ticket.destinatarioName || 'Todo el grupo'}
          </Text>
        </View>
        {ticket.locationLabel && (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
            <Text style={styles.metaText}>{ticket.locationLabel}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#6b7280" />
          <Text style={styles.metaText}>
            Creado: {new Date(ticket.createdAt).toLocaleString('es-PE')}
          </Text>
        </View>
      </View>

      <DocumentoVivo entityId={id as string} entityType="TICKET" />
    </SafeAreaView>
  );
}

const getStatusColor = (status?: string) => {
  const s = status?.toUpperCase();
  switch (s) {
    case 'NUEVO': return '#fbbf24';
    case 'EN_PROCESO': return '#3b82f6';
    case 'COMPLETADO': return '#10b981';
    case 'CERRADO': return '#78716c';
    default: return '#9ca3af';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 16 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 14, color: '#4b5563', marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaText: { marginLeft: 6, fontSize: 13, color: '#6b7280', flex: 1 },
  errorTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b', marginTop: 16 },
  errorSubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: 'white', fontWeight: 'bold' },
});
