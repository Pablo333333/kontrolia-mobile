import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTickets, useArchivedTickets } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates, useCategories, useUsers } from '@/features/catalog/hooks/use-catalog';
import { filterTicketByState } from '@/features/tickets/utils/filter-by-state';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const STATUS_LABELS: Record<string, string> = {
  NUEVO: 'Nuevos',
  EN_PROCESO: 'En Proceso',
  COMPLETADO: 'Completados',
  CERRADO: 'Cerrados',
};

const MESSAGE_TYPES = [
  { value: '', label: 'Tipo' },
  { value: 'COORDINACION', label: 'Coordinación' },
  { value: 'TRAMITE', label: 'Trámite' },
  { value: 'DOCUMENTOS_TECNICOS', label: 'Docs técnicos' },
  { value: 'CONVENIOS', label: 'Convenios' },
];

const PRIORITIES = [
  { value: '', label: 'Prioridad' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
];

type InboxView = 'active' | 'historical';

export default function TicketsListScreen() {
  const router = useRouter();
  const { status, view } = useLocalSearchParams<{ status?: string; view?: string }>();
  const [inboxView, setInboxView] = useState<InboxView>(view === 'historical' ? 'historical' : 'active');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [priority, setPriority] = useState('');
  const [messageType, setMessageType] = useState('');
  const [remitenteId, setRemitenteId] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: states } = useWorkflowStates();
  const { data: categories } = useCategories();
  const { data: users } = useUsers();

  const selectedCategory = categories?.find(c => c.id === categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];

  const listFilters = {
    categoryId: categoryId || undefined,
    subcategoryId: subcategoryId || undefined,
    priority: priority || undefined,
    messageType: messageType || undefined,
    userId: remitenteId || undefined,
    destinatarioId: destinatarioId || undefined,
  };

  const { data: activeTickets, isLoading: loadingActive, refetch: refetchActive } = useTickets(listFilters);
  const { data: archivedTickets, isLoading: loadingArchived, refetch: refetchArchived } = useArchivedTickets({
    enabled: inboxView === 'historical',
  });

  const sourceTickets = inboxView === 'historical' ? archivedTickets : activeTickets;
  const isLoading = inboxView === 'historical' ? loadingArchived : loadingActive;

  const filteredTickets = useMemo(() => {
    if (searchResults) return searchResults;
    let all = sourceTickets || [];

    if (inboxView === 'historical') {
      all = all.filter(t => {
        const name = (t.statusName || t.workflowState?.name || '').toUpperCase();
        return name === 'CERRADO' || t.isArchived;
      });
      if (categoryId) all = all.filter(t => t.categoryId === categoryId);
      if (subcategoryId) all = all.filter(t => t.subcategoryId === subcategoryId);
      if (priority) all = all.filter(t => t.priority === priority);
      if (messageType) all = all.filter(t => t.messageType === messageType);
      if (remitenteId) all = all.filter((t: any) => t.userId === remitenteId);
      if (destinatarioId) all = all.filter((t: any) => t.destinatarioId === destinatarioId);
      return all;
    }

    if (!status) return all;

    const targetName = status.toUpperCase();
    const targetState = (states || []).find(s => s.name.toUpperCase() === targetName);
    return all.filter(t => filterTicketByState(t, targetState, targetName));
  }, [
    sourceTickets, states, status, inboxView,
    categoryId, subcategoryId, priority, messageType, remitenteId, destinatarioId,
    searchResults,
  ]);

  const runSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const { ticketsService } = await import('@/features/tickets/services/tickets.service');
      const results = await ticketsService.search({ q, mode: 'semantic' });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getStatusColor = (statusName?: string) => {
    const s = statusName?.toUpperCase();
    switch (s) {
      case 'NUEVO': return '#fbbf24';
      case 'EN_PROCESO': return '#3b82f6';
      case 'COMPLETADO': return '#10b981';
      case 'CERRADO': return '#78716c';
      default: return '#9ca3af';
    }
  };

  const StatusBadge = ({ statusName }: { statusName?: string }) => {
    const label = statusName || 'N/A';
    return (
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statusName) }]}>
        <Text style={styles.statusText}>{label}</Text>
      </View>
    );
  };

  const FilterChip = ({
    label,
    active,
    onPress,
  }: { label: string; active?: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.optionChip, active && styles.optionChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        if (item.id) {
          router.push(`/tickets/${item.id}`);
        }
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color="#3b82f6" />
          <Text style={styles.typeText} numberOfLines={1}>
            {item.title || item.type || 'Mensaje'}
          </Text>
        </View>
        <StatusBadge statusName={item.statusName || item.workflowState?.name || item.status?.name} />
      </View>

      <View style={styles.chainRow}>
        <View style={[styles.chainBadge, item.isContinuation ? styles.chainContinuation : styles.chainNew]}>
          <Text style={[styles.chainBadgeText, item.isContinuation ? styles.chainContinuationText : styles.chainNewText]}>
            {item.isContinuation ? 'Continuación' : 'Nuevo tema'}
          </Text>
        </View>
        {item.subcategoryName ? (
          <Text style={styles.subcatText}>{item.subcategoryName}</Text>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        {item.description && <Text style={styles.descriptionText} numberOfLines={2}>{item.description}</Text>}
        <Text style={styles.senderText}>De: {item.remitenteName || 'Sistema'}</Text>
        <Text style={styles.receiverText}>Para: {item.destinatarioName || 'Todo el grupo'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <MaterialCommunityIcons name="calendar" size={14} color="#9ca3af" />
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('es-PE')}</Text>
      </View>
    </TouchableOpacity>
  );

  const switchInbox = (nextView: InboxView) => {
    setInboxView(nextView);
    if (nextView === 'historical') {
      router.setParams({ view: 'historical', status: undefined });
    } else {
      router.setParams({ view: undefined });
    }
  };

  const clearFilter = () => {
    router.replace('/tickets');
    setInboxView('active');
  };

  const clearAdvancedFilters = () => {
    setCategoryId('');
    setSubcategoryId('');
    setPriority('');
    setMessageType('');
    setRemitenteId('');
    setDestinatarioId('');
  };

  const refetch = () => {
    if (inboxView === 'historical') refetchArchived();
    else refetchActive();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inboxTabs}>
        <TouchableOpacity
          style={[styles.inboxTab, inboxView === 'active' && styles.inboxTabActive]}
          onPress={() => switchInbox('active')}
        >
          <Text style={[styles.inboxTabText, inboxView === 'active' && styles.inboxTabTextActive]}>
            Activos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.inboxTab, inboxView === 'historical' && styles.inboxTabActive]}
          onPress={() => switchInbox('historical')}
        >
          <Text style={[styles.inboxTabText, inboxView === 'historical' && styles.inboxTabTextActive]}>
            Histórico (Cerrados)
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por sentido o palabras..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={runSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={runSearch} disabled={searching}>
          {searching ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialCommunityIcons name="magnify" size={20} color="#fff" />
          )}
        </TouchableOpacity>
        {searchResults && (
          <TouchableOpacity
            style={styles.clearSearchBtn}
            onPress={() => {
              setSearchResults(null);
              setSearchQuery('');
            }}
          >
            <MaterialCommunityIcons name="close" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.filtersToggle} onPress={() => setShowFilters(v => !v)}>
        <MaterialCommunityIcons name="filter-variant" size={18} color="#2563eb" />
        <Text style={styles.filtersToggleText}>
          {showFilters ? 'Ocultar filtros' : 'Filtros avanzados'}
        </Text>
      </TouchableOpacity>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterSectionLabel}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <FilterChip label="Todas" active={!categoryId} onPress={() => { setCategoryId(''); setSubcategoryId(''); }} />
            {(categories || []).map(c => (
              <FilterChip
                key={c.id}
                label={c.name}
                active={categoryId === c.id}
                onPress={() => { setCategoryId(c.id); setSubcategoryId(''); }}
              />
            ))}
          </ScrollView>

          {!!categoryId && subcategories.length > 0 && (
            <>
              <Text style={styles.filterSectionLabel}>Subcategoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                <FilterChip label="Todas" active={!subcategoryId} onPress={() => setSubcategoryId('')} />
                {subcategories.map(s => (
                  <FilterChip
                    key={s.id}
                    label={s.name}
                    active={subcategoryId === s.id}
                    onPress={() => setSubcategoryId(s.id)}
                  />
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.filterSectionLabel}>Prioridad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {PRIORITIES.map(p => (
              <FilterChip
                key={p.value || 'all-prio'}
                label={p.label}
                active={priority === p.value}
                onPress={() => setPriority(p.value)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterSectionLabel}>Tipo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {MESSAGE_TYPES.map(t => (
              <FilterChip
                key={t.value || 'all-type'}
                label={t.label}
                active={messageType === t.value}
                onPress={() => setMessageType(t.value)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterSectionLabel}>Remitente</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <FilterChip label="Todos" active={!remitenteId} onPress={() => setRemitenteId('')} />
            {(users || []).map(u => (
              <FilterChip
                key={u.id}
                label={u.name || u.email}
                active={remitenteId === u.id}
                onPress={() => setRemitenteId(u.id)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterSectionLabel}>Destinatario</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <FilterChip label="Todos" active={!destinatarioId} onPress={() => setDestinatarioId('')} />
            {(users || []).map(u => (
              <FilterChip
                key={`dest-${u.id}`}
                label={u.name || u.email}
                active={destinatarioId === u.id}
                onPress={() => setDestinatarioId(u.id)}
              />
            ))}
          </ScrollView>

          <TouchableOpacity onPress={clearAdvancedFilters} style={styles.clearAdvancedBtn}>
            <Text style={styles.clearAdvancedText}>Limpiar filtros</Text>
          </TouchableOpacity>
        </View>
      )}

      {status && inboxView === 'active' && (
        <View style={styles.filterBar}>
          <View style={styles.filterChip}>
            <MaterialCommunityIcons name="filter-variant" size={16} color="#2563eb" />
            <Text style={styles.filterChipText}>
              {STATUS_LABELS[status.toUpperCase()] || status}
            </Text>
          </View>
          <TouchableOpacity onPress={clearFilter} style={styles.clearFilterBtn}>
            <Text style={styles.clearFilterText}>Ver todos</Text>
            <MaterialCommunityIcons name="close" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTickets}
        renderItem={renderItem}
        keyExtractor={(item) => (item?.id ? item.id.toString() : Math.random().toString())}
        contentContainerStyle={styles.list}
        onRefresh={refetch}
        refreshing={isLoading}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.emptyText}>
              {inboxView === 'historical'
                ? 'No hay mensajes cerrados en el histórico.'
                : status
                  ? `No hay mensajes en estado "${STATUS_LABELS[status.toUpperCase()] || status}".`
                  : 'No tienes mensajes pendientes.'}
            </Text>
          )
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/new-ticket')}
      >
        <MaterialCommunityIcons name="plus" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  inboxTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  inboxTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  inboxTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  inboxTabText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  inboxTabTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    fontSize: 14,
  },
  searchBtn: {
    backgroundColor: '#2563eb',
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSearchBtn: {
    padding: 8,
  },
  filtersToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  filtersPanel: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  chipsRow: {
    paddingHorizontal: 12,
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionChipActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  optionChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  clearAdvancedBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginRight: 16,
  },
  clearAdvancedText: {
    fontSize: 13,
    color: '#64748b',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#64748b',
  },
  list: { padding: 16 },
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 16,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  chainRow: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chainBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chainNew: {
    backgroundColor: '#eff6ff',
  },
  chainContinuation: {
    backgroundColor: '#f5f3ff',
  },
  chainBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chainNewText: {
    color: '#2563eb',
  },
  chainContinuationText: {
    color: '#7c3aed',
  },
  subcatText: {
    fontSize: 11,
    color: '#64748b',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeText: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardBody: { marginBottom: 12 },
  descriptionText: { fontSize: 14, color: '#1f2937', marginBottom: 8 },
  senderText: { fontSize: 13, color: '#4b5563' },
  receiverText: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8 },
  dateText: { marginLeft: 4, fontSize: 12, color: '#9ca3af' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6b7280', paddingHorizontal: 20 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: '#3b82f6',
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center',
    alignItems: 'center', elevation: 4, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84,
  },
});
