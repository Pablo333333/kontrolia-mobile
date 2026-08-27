import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Image,
  TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTeamSettings, useCategories, useSubcategories, useMyPreferences } from '@/features/catalog/hooks/use-catalog';
import { catalogService } from '@/features/catalog/services/catalog.service';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth/context/AuthProvider';
import { isAdmin, isManager } from '@/features/auth/utils/roles';
import { useWorkGroups, useSetActiveWorkGroup } from '@/features/work-groups/hooks/use-work-groups';
import { workGroupsService } from '@/features/work-groups/services/work-groups.service';

export default function TeamSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: team, isLoading: loadingTeam } = useTeamSettings();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: subcategories, isLoading: loadingSubcategories } = useSubcategories();
  const { data: groups, isLoading: loadingGroups } = useWorkGroups();
  const { data: prefs } = useMyPreferences();
  const setActive = useSetActiveWorkGroup();
  const [phone, setPhone] = useState('');
  const [inboxPref, setInboxPref] = useState('active');
  const [searchPref, setSearchPref] = useState('semantic');

  useEffect(() => {
    if (prefs) {
      setInboxPref(prefs.defaultInboxView || 'active');
      setSearchPref(prefs.searchMode || 'semantic');
    }
  }, [prefs]);

  useEffect(() => {
    if (user && !isManager(user) && !isAdmin(user)) {
      // Operarios can still set WhatsApp phone and switch among their groups
    }
  }, [user]);

  const isLoading = loadingTeam || loadingCategories || loadingSubcategories || loadingGroups;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const savePhone = async () => {
    try {
      await workGroupsService.updateContact(phone.trim());
      Alert.alert('Listo', 'Teléfono WhatsApp guardado');
    } catch {
      Alert.alert('Error', 'No se pudo guardar el teléfono');
    }
  };

  const savePreferences = async () => {
    try {
      await catalogService.updateMyPreferences({
        defaultInboxView: inboxPref,
        searchMode: searchPref,
      });
      Alert.alert('Listo', 'Preferencias personales guardadas');
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Grupos y equipo', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.headerCard, { borderColor: team?.primaryColor || '#2563eb' }]}>
          {team?.logoUrl ? (
            <Image source={{ uri: team.logoUrl }} style={styles.logo} resizeMode="contain" />
          ) : (
            <MaterialCommunityIcons name="office-building" size={40} color={team?.primaryColor || '#2563eb'} />
          )}
          <Text style={[styles.teamName, { color: team?.primaryColor || '#2563eb' }]}>
            {team?.displayName || 'CONECTA'}
          </Text>
          <Text style={styles.teamId}>Grupo activo: {team?.groupIdentifier || '—'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Mis grupos de trabajo</Text>
        {(groups || []).map(group => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            onPress={() =>
              setActive.mutate(group.id, {
                onSuccess: () => Alert.alert('Grupo activo', `Ahora usas ${group.name}`),
              })
            }
          >
            <View style={[styles.colorDot, { backgroundColor: group.primaryColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{group.name}</Text>
              <Text style={styles.groupMeta}>
                {group.identifier} · {group._count?.members ?? group.members?.length ?? 0} integrantes
              </Text>
              {group.topics && group.topics.length > 0 && (
                <Text style={styles.groupTopics}>
                  Temas: {group.topics.map(t => t.category.name).join(', ')}
                </Text>
              )}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>WhatsApp / alertas</Text>
        <Text style={styles.hint}>
          Registra tu número en formato internacional para recibir alertas urgentes y el resumen diario.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="+51999999999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <TouchableOpacity style={styles.saveBtn} onPress={savePhone}>
          <Text style={styles.saveBtnText}>Guardar teléfono</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Mis preferencias</Text>
        <Text style={styles.hint}>Bandeja por defecto y modo de búsqueda contextual.</Text>
        <View style={styles.prefRow}>
          <TouchableOpacity
            style={[styles.prefChip, inboxPref === 'active' && styles.prefChipActive]}
            onPress={() => setInboxPref('active')}
          >
            <Text style={styles.prefChipText}>Activos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prefChip, inboxPref === 'historical' && styles.prefChipActive]}
            onPress={() => setInboxPref('historical')}
          >
            <Text style={styles.prefChipText}>Histórico</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.prefRow}>
          <TouchableOpacity
            style={[styles.prefChip, searchPref === 'semantic' && styles.prefChipActive]}
            onPress={() => setSearchPref('semantic')}
          >
            <Text style={styles.prefChipText}>Búsqueda contextual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.prefChip, searchPref === 'literal' && styles.prefChipActive]}
            onPress={() => setSearchPref('literal')}
          >
            <Text style={styles.prefChipText}>Búsqueda literal</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={savePreferences}>
          <Text style={styles.saveBtnText}>Guardar preferencias</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Categorías del catálogo</Text>
        {categories?.map(category => (
          <View key={category.id} style={styles.categoryCard}>
            <Text style={styles.categoryName}>{category.name}</Text>
            {category.description ? (
              <Text style={styles.categoryDesc}>{category.description}</Text>
            ) : null}
            {category.subcategories?.map(sub => (
              <View key={sub.id} style={styles.subcategoryRow}>
                <MaterialCommunityIcons name="subdirectory-arrow-right" size={14} color="#64748b" />
                <Text style={styles.subcategoryText}>{sub.name}</Text>
              </View>
            ))}
          </View>
        ))}

        {subcategories && subcategories.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Subcategorías</Text>
            {subcategories.map(sub => (
              <View key={sub.id} style={styles.categoryCard}>
                <Text style={styles.categoryName}>{sub.name}</Text>
              </View>
            ))}
          </>
        )}

        {!isManager(user) && (
          <Text style={styles.footerNote}>
            La creación de grupos la realiza un administrador o supervisor desde el panel web.
          </Text>
        )}

        {isManager(user) && (
          <>
            <Text style={styles.sectionTitle}>Personalización rápida</Text>
            <Text style={styles.hint}>
              Edita logo, color y categorías completas desde la web en /configuracion. Aquí puedes actualizar el color del grupo activo.
            </Text>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={async () => {
                try {
                  await catalogService.updateTeamSettings({
                    primaryColor: team?.primaryColor || '#2563eb',
                    displayName: team?.displayName,
                  });
                  Alert.alert('Listo', 'Configuración sincronizada con el servidor');
                } catch {
                  Alert.alert('Error', 'No se pudo actualizar');
                }
              }}
            >
              <Text style={styles.saveBtnText}>Sincronizar identidad del grupo</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  headerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 2, marginBottom: 20,
  },
  logo: { width: 72, height: 72, marginBottom: 8 },
  teamName: { fontSize: 22, fontWeight: 'bold' },
  teamId: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#334155', marginBottom: 10, marginTop: 8 },
  groupCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  groupMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  groupTopics: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16,
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  categoryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0',
  },
  categoryName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  categoryDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  subcategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  subcategoryText: { fontSize: 13, color: '#475569' },
  footerNote: { fontSize: 12, color: '#94a3b8', marginTop: 16, textAlign: 'center' },
  prefRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  prefChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  prefChipActive: { backgroundColor: '#eff6ff', borderColor: '#2563eb' },
  prefChipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
});
