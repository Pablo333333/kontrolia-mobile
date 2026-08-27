import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Marker, Callout } from 'react-native-maps';
import { useTickets } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates } from '@/features/catalog/hooks/use-catalog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { DocumentoVivo } from '@/components/DocumentoVivo';
import { SafeMap } from '@/components/SafeMap';
import { filterTicketByState } from '@/features/tickets/utils/filter-by-state';

export default function MapScreen() {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [filterVisible, setFilterVisible] = useState(false);

  const { data: tickets, isLoading } = useTickets();
  const { data: states } = useWorkflowStates();

  const allMarkers = useMemo(() => {
    const withCoords = (tickets || []).filter(t => t.latitude && t.longitude);
    if (!statusFilter) return withCoords;

    const targetState = (states || []).find(s => s.id === statusFilter);
    const targetName = targetState?.name.toUpperCase() ?? '';
    return withCoords.filter(t => filterTicketByState(t, targetState, targetName));
  }, [tickets, statusFilter, states]);

  const mapRegion = useMemo(() => {
    if (allMarkers.length > 0) {
      const first = allMarkers[0];
      return {
        latitude: first.latitude!,
        longitude: first.longitude!,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
    }
    return {
      latitude: -12.046374,
      longitude: -77.042793,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  }, [allMarkers]);

  const selectedFilterLabel = statusFilter
    ? states?.find(s => s.id === statusFilter)?.name ?? 'Filtrado'
    : 'Todos los estados';

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Mapa de mensajes' }} />

      <SafeMap style={styles.map} initialRegion={mapRegion}>
        {allMarkers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{ latitude: marker.latitude!, longitude: marker.longitude! }}
            pinColor="#3b82f6"
          >
            <Callout onPress={() => setSelectedEntityId(marker.id)}>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.title || 'Mensaje'}</Text>
                <Text style={styles.calloutSubtitle}>{marker.statusName}</Text>
                {marker.locationLabel && (
                  <Text style={styles.calloutLocation}>{marker.locationLabel}</Text>
                )}
                <Text style={styles.calloutLink}>Toca para ver Documento Vivo</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </SafeMap>

      <View style={styles.filterInfo}>
        <MaterialCommunityIcons name="filter-variant" size={16} color="#2563eb" />
        <Text style={styles.filterInfoText}>{selectedFilterLabel} • {allMarkers.length} en mapa</Text>
      </View>

      <Modal
        visible={!!selectedEntityId}
        animationType="slide"
        onRequestClose={() => setSelectedEntityId(null)}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Documento Vivo</Text>
            <TouchableOpacity onPress={() => setSelectedEntityId(null)}>
              <MaterialCommunityIcons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          {selectedEntityId && (
            <DocumentoVivo entityId={selectedEntityId} entityType="TICKET" />
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <Text style={styles.filterTitle}>Filtrar por estado</Text>
            <ScrollView>
              <TouchableOpacity
                style={[styles.filterOption, !statusFilter && styles.filterOptionActive]}
                onPress={() => {
                  setStatusFilter('');
                  setFilterVisible(false);
                }}
              >
                <Text style={styles.filterOptionText}>Todos los estados</Text>
              </TouchableOpacity>
              {states?.map(state => (
                <TouchableOpacity
                  key={state.id}
                  style={[styles.filterOption, statusFilter === state.id && styles.filterOptionActive]}
                  onPress={() => {
                    setStatusFilter(state.id);
                    setFilterVisible(false);
                  }}
                >
                  <Text style={styles.filterOptionText}>{state.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TouchableOpacity style={styles.filterFab} onPress={() => setFilterVisible(true)}>
        <MaterialCommunityIcons name="filter" size={20} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  callout: { width: 220, padding: 8 },
  calloutTitle: { fontWeight: 'bold', fontSize: 14 },
  calloutSubtitle: { fontSize: 12, color: '#6b7280', marginVertical: 2 },
  calloutLocation: { fontSize: 11, color: '#2563eb', marginBottom: 2 },
  calloutLink: { fontSize: 10, color: '#3b82f6', fontWeight: 'bold', marginTop: 4 },
  filterInfo: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  filterInfoText: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  filterFab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#3b82f6',
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 3.84,
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
  },
  filterTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#1f2937' },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  filterOptionActive: { backgroundColor: '#eff6ff' },
  filterOptionText: { fontSize: 14, color: '#374151' },
});
