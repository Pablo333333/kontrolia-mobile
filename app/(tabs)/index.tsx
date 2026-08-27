import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/Themed';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTicketStats } from '@/features/tickets/hooks/use-tickets';
import { useTeamSettings } from '@/features/catalog/hooks/use-catalog';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { getRoleLabel, isManager } from '@/features/auth/utils/roles';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { fetchNotificationReport } from '@/features/notifications/push.service';

type StatusFilter = 'NUEVO' | 'EN_PROCESO' | 'COMPLETADO' | 'CERRADO' | 'CANCELADO';

export default function DashboardScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();
  const { data: statsData, isLoading: loadingStats } = useTicketStats();
  const { data: teamSettings } = useTeamSettings();
  const { data: notificationReport } = useQuery({
    queryKey: ['notification-report'],
    queryFn: fetchNotificationReport,
  });

  const dashboard = statsData?.dashboard ?? {
    nuevos: 0,
    enProceso: 0,
    completados: 0,
    cerrados: 0,
    cancelados: 0,
    vencidos: 0,
    nuevosTemas: 0,
    continuaciones: 0,
  };
  const kpis = statsData?.kpis ?? { total: 0, pending: 0, completed: 0, urgent: 0 };
  const byCategory = statsData?.byCategory ?? [];
  const byPriority = statsData?.byPriority ?? [];
  const byMessageType = statsData?.byMessageType ?? [];
  const evolution = statsData?.evolution ?? [];

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de la aplicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const handleStatPress = (status: StatusFilter) => {
    if (status === 'CERRADO') {
      router.push({ pathname: '/tickets', params: { view: 'historical' } });
      return;
    }
    router.push({ pathname: '/tickets', params: { status } });
  };

  if (loadingStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, teamSettings?.primaryColor ? { color: teamSettings.primaryColor } : null]}>
              {teamSettings?.displayName || 'Dashboard de Control'}
            </Text>
            <Text style={styles.headerSubtitle}>Estado de los mensajes</Text>
            <Text style={styles.roleBadge}>
              {getRoleLabel(user)}
              {isManager(user) ? ' · Gestión' : ' · Campo'}
            </Text>
            {teamSettings?.groupIdentifier && (
              <Text style={styles.groupIdentifier}>Grupo: {teamSettings.groupIdentifier}</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => router.push('/team-settings')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="cog-outline" size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
              <MaterialCommunityIcons name="logout" size={20} color="#64748b" />
              <Text style={styles.logoutText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(notificationReport?.overdue ?? 0) > 0 && (
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="bell-alert" size={24} color="#fff" />
            <Text style={styles.alertText}>
              {notificationReport?.overdue} mensaje(s) vencido(s) requieren atención
            </Text>
          </View>
        )}

        {dashboard.vencidos > 0 && (
          <View style={styles.alertCard}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#fff" />
            <Text style={styles.alertText}>
              {dashboard.vencidos} mensaje(s) con fecha límite vencida
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Estados</Text>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#fbbf24' }]} onPress={() => handleStatPress('NUEVO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.nuevos}</Text>
            <Text style={styles.statLabel}>Nuevos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#3b82f6' }]} onPress={() => handleStatPress('EN_PROCESO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.enProceso}</Text>
            <Text style={styles.statLabel}>En Proceso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#10b981' }]} onPress={() => handleStatPress('COMPLETADO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.completados}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statsGrid}>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#ef4444' }]} onPress={() => handleStatPress('NUEVO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.vencidos}</Text>
            <Text style={styles.statLabel}>Vencidos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#78716c' }]} onPress={() => handleStatPress('CERRADO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.cerrados}</Text>
            <Text style={styles.statLabel}>Cerrados</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.statCard, { borderLeftColor: '#f97316' }]} onPress={() => handleStatPress('CANCELADO')} activeOpacity={0.7}>
            <Text style={styles.statNumber}>{dashboard.cancelados}</Text>
            <Text style={styles.statLabel}>Cancelados</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Indicadores</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
            <Text style={styles.statNumber}>{kpis.urgent}</Text>
            <Text style={styles.statLabel}>Urgentes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
            <Text style={styles.statNumber}>{kpis.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#4f46e5' }]}>
            <Text style={styles.statNumber}>{kpis.total}</Text>
            <Text style={styles.statLabel}>Total activos</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Cadenas de comunicación</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCardWide, { borderLeftColor: '#2563eb' }]}>
            <Text style={styles.statNumber}>{dashboard.nuevosTemas}</Text>
            <Text style={styles.statLabel}>Nuevos temas</Text>
          </View>
          <View style={[styles.statCardWide, { borderLeftColor: '#7c3aed' }]}>
            <Text style={styles.statNumber}>{dashboard.continuaciones}</Text>
            <Text style={styles.statLabel}>Continuaciones</Text>
          </View>
        </View>

        {byMessageType.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Por tipo de mensaje</Text>
            <View style={styles.listCard}>
              {byMessageType.map(item => (
                <View key={item.name} style={styles.listRow}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {byPriority.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Por prioridad</Text>
            <View style={styles.listCard}>
              {byPriority.map(item => (
                <View key={item.name} style={styles.listRow}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {byCategory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Por categoría</Text>
            <View style={styles.listCard}>
              {byCategory.map(item => (
                <View key={item.name} style={styles.listRow}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {isManager(user) && evolution.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Evolución (7 días)</Text>
            <View style={styles.listCard}>
              {evolution.map(item => (
                <View key={item.name} style={styles.listRow}>
                  <Text style={styles.listName}>{item.name}</Text>
                  <Text style={styles.listValue}>+{item.creados} / ✓{item.cerrados}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => router.push('/new-ticket')}
            activeOpacity={0.8}
          >
            <View style={styles.primaryIconCircle}>
              <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.primaryActionText}>Nuevo tema de comunicación</Text>
              <Text style={styles.primaryActionSubtext}>Inicia una nueva cadena</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => router.push('/tickets')}
            activeOpacity={0.8}
          >
            <View style={styles.secondaryIconCircle}>
              <MaterialCommunityIcons name="email-outline" size={28} color="#2563eb" />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={styles.secondaryActionText}>Seguimiento de comunicación</Text>
              <Text style={styles.secondaryActionSubtext}>
                {isOperarioLabel(user)
                  ? 'Bandeja operativa de mensajes'
                  : 'Bandeja y gestión de mensajes'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function isOperarioLabel(user: { role?: string } | null) {
  return user?.role?.toUpperCase() === 'OPERARIO';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, flexGrow: 1, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTextContainer: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 16, color: '#64748b', marginTop: 4 },
  roleBadge: { fontSize: 12, color: '#2563eb', fontWeight: '700', marginTop: 4 },
  groupIdentifier: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsButton: { backgroundColor: '#fff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 4,
  },
  logoutText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  alertCard: {
    backgroundColor: '#ef4444', borderRadius: 12, padding: 16, flexDirection: 'row',
    alignItems: 'center', marginBottom: 16,
  },
  alertText: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginLeft: 10, flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10, marginTop: 8 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 8 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, flex: 1, alignItems: 'center',
    borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statCardWide: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, flex: 1, alignItems: 'center',
    borderLeftWidth: 4,
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  listCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  listName: { fontSize: 13, color: '#475569', flex: 1 },
  listValue: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  actionsContainer: { gap: 16, marginTop: 16 },
  primaryActionButton: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 20,
    borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  secondaryActionButton: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', padding: 20,
    borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0',
  },
  primaryIconCircle: {
    backgroundColor: '#2563eb', width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  secondaryIconCircle: {
    backgroundColor: '#eff6ff', width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  actionTextContainer: { flex: 1 },
  primaryActionText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  primaryActionSubtext: { fontSize: 13, color: '#64748b' },
  secondaryActionText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 2 },
  secondaryActionSubtext: { fontSize: 13, color: '#64748b' },
});
