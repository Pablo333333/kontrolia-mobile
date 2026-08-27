import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDraftSmartDocument, useSaveSmartDocument, useGenerateTicketPdf } from '@/features/tickets/hooks/use-smart-document';
import { useSubcategories, useTeamSettings } from '@/features/catalog/hooks/use-catalog';
import { useAuth } from '@/features/auth/context/AuthProvider';

type Step = 'form' | 'review';

export default function SmartDocumentScreen() {
  const router = useRouter();
  const { ticketId, title: initialTitle, description: initialDescription, location, priority, tramiteSubtype } =
    useLocalSearchParams<{
      ticketId?: string;
      title?: string;
      description?: string;
      location?: string;
      priority?: string;
      tramiteSubtype?: string;
    }>();

  const { user } = useAuth();
  const { data: subcategories } = useSubcategories();
  const { data: teamSettings } = useTeamSettings();

  const [step, setStep] = useState<Step>('form');
  const [title, setTitle] = useState(initialTitle || '');
  const [documentDate, setDocumentDate] = useState(new Date().toISOString().slice(0, 10));
  const [responsible, setResponsible] = useState(user?.name || user?.email || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [docLocation, setDocLocation] = useState(location || '');
  const [docPriority, setDocPriority] = useState(priority || 'MEDIA');
  const [attachmentsSummary, setAttachmentsSummary] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const draftMutation = useDraftSmartDocument();
  const saveMutation = useSaveSmartDocument(ticketId || '');
  const pdfMutation = useGenerateTicketPdf(ticketId || '');

  useEffect(() => {
    if (user?.name || user?.email) {
      setResponsible(user.name || user.email);
    }
  }, [user]);

  const handleGenerateDraft = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    draftMutation.mutate(
      {
        title: title.trim(),
        documentDate,
        responsible: responsible.trim(),
        description: description.trim(),
        location: docLocation.trim(),
        priority: docPriority,
        attachmentsSummary: attachmentsSummary.trim(),
        tramiteSubtype: tramiteSubtype || undefined,
        subcategoryName: subcategoryName || undefined,
      },
      {
        onSuccess: (data) => {
          setDraftContent(data.content);
          setStep('review');
        },
        onError: () => Alert.alert('Error', 'No se pudo generar el borrador'),
      },
    );
  };

  const handleSave = () => {
    if (!ticketId) {
      Alert.alert('Información', 'Guarda primero el mensaje para vincular el documento automático.');
      return;
    }
    if (!draftContent.trim()) {
      Alert.alert('Error', 'El documento está vacío');
      return;
    }

    saveMutation.mutate(
      { content: draftContent, title: title.trim() },
      {
        onSuccess: () => {
          Alert.alert('Éxito', 'Documento guardado en el hilo de comunicación', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: () => Alert.alert('Error', 'No se pudo guardar el documento'),
      },
    );
  };

  const handleExportPdf = () => {
    if (!ticketId) {
      Alert.alert('Información', 'Guarda el mensaje primero para exportar el PDF oficial.');
      return;
    }
    pdfMutation.mutate(undefined, {
      onSuccess: () => Alert.alert('PDF generado', 'El documento PDF fue generado correctamente en el servidor.'),
      onError: () => Alert.alert('Error', 'No se pudo generar el PDF'),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Redacción inteligente', presentation: 'modal' }} />
      <ScrollView contentContainerStyle={styles.content}>
        {teamSettings && (
          <View style={styles.teamBanner}>
            <MaterialCommunityIcons name="office-building" size={20} color={teamSettings.primaryColor} />
            <View style={styles.teamTextWrap}>
              <Text style={[styles.teamName, { color: teamSettings.primaryColor }]}>
                {teamSettings.displayName}
              </Text>
              <Text style={styles.teamId}>ID grupo: {teamSettings.groupIdentifier}</Text>
            </View>
          </View>
        )}

        {step === 'form' ? (
          <>
            <Text style={styles.label}>Título</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Asunto del documento" />

            <Text style={styles.label}>Fecha</Text>
            <TextInput style={styles.input} value={documentDate} onChangeText={setDocumentDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.label}>Responsable</Text>
            <TextInput style={styles.input} value={responsible} onChangeText={setResponsible} />

            <Text style={styles.label}>Subcategoría (opcional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
              {subcategories?.map(sub => (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.chip, subcategoryName === sub.name && styles.chipActive]}
                  onPress={() => setSubcategoryName(sub.name)}
                >
                  <Text style={[styles.chipText, subcategoryName === sub.name && styles.chipTextActive]}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Contenido base del documento"
            />

            <Text style={styles.label}>Ubicación</Text>
            <TextInput style={styles.input} value={docLocation} onChangeText={setDocLocation} />

            <Text style={styles.label}>Prioridad</Text>
            <TextInput style={styles.input} value={docPriority} onChangeText={setDocPriority} />

            <Text style={styles.label}>Adjuntos (referencia)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={attachmentsSummary}
              onChangeText={setAttachmentsSummary}
              multiline
              placeholder="Lista de archivos o fotografías adjuntas"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerateDraft} disabled={draftMutation.isPending}>
              {draftMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Generar documento automático</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.reviewHint}>
              Revisa y edita el documento estructurado antes de guardar o exportar.
            </Text>
            <TextInput
              style={[styles.input, styles.reviewArea]}
              value={draftContent}
              onChangeText={setDraftContent}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('form')}>
              <Text style={styles.secondaryBtnText}>Volver al formulario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSave}
              disabled={!ticketId || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Guardar en el hilo</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handleExportPdf}
              disabled={!ticketId || pdfMutation.isPending}
            >
              {pdfMutation.isPending ? (
                <ActivityIndicator color="#2563eb" />
              ) : (
                <Text style={styles.outlineBtnText}>Exportar PDF oficial</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  teamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    marginBottom: 16,
  },
  teamTextWrap: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: 'bold' },
  teamId: { fontSize: 12, color: '#64748b', marginTop: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  reviewArea: { minHeight: 320, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  reviewHint: { fontSize: 13, color: '#64748b', marginBottom: 10 },
  chipsRow: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 8,
    backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { marginTop: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#64748b', fontSize: 14 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  outlineBtnText: { color: '#2563eb', fontWeight: 'bold' },
});
