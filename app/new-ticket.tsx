import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';
import { useCreateTicket, useAnalyzeTicketImage, useTicket } from '@/features/tickets/hooks/use-tickets';
import { useWorkflowStates, useUsers, useCategories } from '@/features/catalog/hooks/use-catalog';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, AudioModule } from 'expo-audio';
import {
  MessageType,
  TramiteSubtype,
  ResponseTimeframe,
  MESSAGE_TYPE_OPTIONS,
  TRAMITE_SUBTYPE_OPTIONS,
  RESPONSE_TIMEFRAME_OPTIONS,
  resolveCategoryId,
  resolveSubcategoryId,
  composeCategoryTitle,
  computePriorityFromTimeframe,
  computeFechaLimite,
  getPriorityDisplayLabel,
} from '@/features/tickets/utils/message-form';

export default function NewTicketScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    parentTicketId?: string;
    title?: string;
    mode?: string;
  }>();
  const parentTicketId = typeof params.parentTicketId === 'string' ? params.parentTicketId : undefined;
  const isContinuation = Boolean(parentTicketId) || params.mode === 'continuation';
  const { data: parentTicket } = useTicket(parentTicketId || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [destinatarioId, setDestinatarioId] = useState('');
  const [messageType, setMessageType] = useState<MessageType>(MessageType.COORDINACION);
  const [tramiteSubtype, setTramiteSubtype] = useState<TramiteSubtype>(TramiteSubtype.SOLICITUD);
  const [responseTimeframe, setResponseTimeframe] = useState<ResponseTimeframe>('MAS_DOS_DIAS');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [workflowStateId, setWorkflowStateId] = useState('');
  const [audioFile, setAudioFile] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [showDestinatarioList, setShowDestinatarioList] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [prefillDone, setPrefillDone] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isProcessing = useRef(false);

  const { data: states } = useWorkflowStates();
  const { data: categories } = useCategories();
  const { data: users } = useUsers();

  const computedPriority = useMemo(
    () => computePriorityFromTimeframe(responseTimeframe),
    [responseTimeframe],
  );

  const priorityLabel = useMemo(
    () => getPriorityDisplayLabel(responseTimeframe),
    [responseTimeframe],
  );

  useEffect(() => {
    if (states && states.length > 0) {
      const newState = states.find(s => s.name.toUpperCase() === 'NUEVO');
      if (newState) setWorkflowStateId(newState.id);
    }
  }, [states]);

  useEffect(() => {
    if (categories && categories.length > 0) {
      const resolved = resolveCategoryId(messageType, categories);
      if (resolved) setCategoryId(resolved);
    }
  }, [categories, messageType]);

  const selectedCategory = useMemo(
    () => categories?.find(c => c.id === categoryId),
    [categories, categoryId],
  );

  useEffect(() => {
    if (!selectedCategory) return;
    const resolved = resolveSubcategoryId(
      selectedCategory,
      messageType,
      messageType === MessageType.TRAMITE ? tramiteSubtype : undefined,
      title,
    );
    if (resolved) setSubcategoryId(resolved);
  }, [selectedCategory, messageType, tramiteSubtype, title]);

  const resolvedSubcategoryName = useMemo(() => {
    return selectedCategory?.subcategories?.find(s => s.id === subcategoryId)?.name;
  }, [selectedCategory, subcategoryId]);

  useEffect(() => {
    if (prefillDone || !isContinuation) return;
    if (params.title && typeof params.title === 'string' && !title) {
      setTitle(params.title.startsWith('Re:') ? params.title : `Re: ${params.title}`);
    }
    if (parentTicket) {
      setTitle(prev => prev || `Re: ${parentTicket.title || 'Seguimiento'}`);
      if (parentTicket.messageType) {
        setMessageType(parentTicket.messageType as MessageType);
      }
      if (parentTicket.tramiteSubtype) {
        setTramiteSubtype(parentTicket.tramiteSubtype as TramiteSubtype);
      }
      if (parentTicket.categoryId) setCategoryId(parentTicket.categoryId);
      setPrefillDone(true);
    } else if (params.title) {
      setPrefillDone(true);
    }
  }, [parentTicket, params.title, isContinuation, prefillDone, title]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setCoords({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        const places = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (places[0]) {
          const place = places[0];
          const label = [place.name, place.street, place.city, place.region]
            .filter(Boolean)
            .join(', ');
          if (label) setLocationLabel(label);
        }
      } catch (error) {
        console.warn('[NewTicket] No se pudo obtener ubicación:', error);
      }
    })();
  }, []);

  const createTicket = useCreateTicket({
    onSuccess: () => {
      Alert.alert(
        'Éxito',
        isContinuation
          ? 'Continuación registrada en el tema existente'
          : 'Nueva cadena de comunicación registrada',
      );
      router.back();
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta nuevamente.');
    },
  });

  const analyzeImage = useAnalyzeTicketImage();

  const selectedDestinatario = users?.find(u => u.id === destinatarioId);

  const handleAiAutofill = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita permiso para la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.uri.split('/').pop() || 'ocr.jpg';

      analyzeImage.mutate(
        { uri: asset.uri, name: fileName, type: 'image/jpeg' },
        {
          onSuccess: (data) => {
            if (data.titulo) setTitle(data.titulo);
            if (data.resumen) setDescription(data.resumen);
            Alert.alert('IA: Análisis completado', `Resumen: ${data.resumen ?? 'Sin resumen'}`);
          },
        },
      );
    }
  };

  const startRecording = async () => {
    if (isProcessing.current || recorderState.isRecording) return;
    isProcessing.current = true;

    try {
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para el micrófono para grabar audio.');
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      if (!recorderState.isRecording) {
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
      }
    } catch (err: any) {
      console.error('Failed to start recording', err);
      if (err.message?.includes('already been prepared')) {
        try {
          audioRecorder.record();
        } catch (retryErr) {
          console.error('Retry record failed', retryErr);
        }
      } else {
        Alert.alert('Error', 'No se pudo iniciar la grabación. Por favor, intenta de nuevo.');
      }
    } finally {
      isProcessing.current = false;
    }
  };

  const stopRecording = async () => {
    if (isProcessing.current || !recorderState.isRecording) return;
    isProcessing.current = true;

    try {
      await audioRecorder.stop();
      await new Promise(resolve => setTimeout(resolve, 200));

      const uri = audioRecorder.uri;
      if (uri) {
        const finalUri = Platform.OS === 'android' && !uri.startsWith('file://') && !uri.startsWith('content://')
          ? `file://${uri}`
          : uri;

        setAudioFile({
          uri: finalUri,
          name: `recording-${Date.now()}.m4a`,
          type: 'audio/m4a',
        });
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    } finally {
      isProcessing.current = false;
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título del tema es obligatorio');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'No se pudo determinar la categoría. Por favor, espera a que se carguen los datos.');
      return;
    }
    if (!workflowStateId) {
      Alert.alert('Error', 'El estado inicial es obligatorio. Por favor, espera a que se carguen los datos.');
      return;
    }
    if (messageType === MessageType.TRAMITE && !tramiteSubtype) {
      Alert.alert('Error', 'Selecciona el tipo de trámite (carta, oficio o solicitud)');
      return;
    }

    const fechaLimite = computeFechaLimite(responseTimeframe).toISOString();
    const finalTitle = composeCategoryTitle(
      selectedCategory?.name,
      resolvedSubcategoryName,
      title.trim(),
    );

    createTicket.mutate({
      title: finalTitle,
      description: description.trim() || undefined,
      categoryId,
      subcategoryId: subcategoryId || undefined,
      workflowStateId,
      destinatarioId: destinatarioId || undefined,
      messageType,
      tramiteSubtype: messageType === MessageType.TRAMITE ? tramiteSubtype : undefined,
      responseUrgency: responseTimeframe,
      priority: computedPriority,
      fechaLimite,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
      locationLabel: locationLabel || undefined,
      parentTicketId: parentTicketId || undefined,
      audioFile: audioFile || undefined,
    });
  };

  const formatDuration = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: isContinuation ? 'Continuar tema de comunicación' : 'Nuevo tema de comunicación',
          presentation: 'modal',
        }}
      />
      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <View style={[styles.modeBanner, isContinuation ? styles.modeContinuation : styles.modeNew]}>
          <MaterialCommunityIcons
            name={isContinuation ? 'source-branch' : 'message-plus-outline'}
            size={18}
            color={isContinuation ? '#7c3aed' : '#2563eb'}
          />
          <Text style={[styles.modeBannerText, isContinuation ? styles.modeContinuationText : styles.modeNewText]}>
            {isContinuation
              ? 'Continuación de un tema existente'
              : 'Nueva cadena de comunicación'}
          </Text>
        </View>

        <Text style={styles.label}>Título del tema</Text>
        <Text style={styles.hint}>
          {selectedCategory
            ? `Categoría: ${selectedCategory.name}${resolvedSubcategoryName ? ` · Subcategoría: ${resolvedSubcategoryName}` : ''}`
            : 'Se ubicará en una subcategoría según los temas de interés del grupo.'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Coordinación de visita técnica..."
          value={title}
          onChangeText={setTitle}
        />

        {coords && (
          <View style={styles.locationCard}>
            <MaterialCommunityIcons name="map-marker" size={18} color="#2563eb" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTitle}>Ubicación de origen registrada</Text>
              <Text style={styles.locationText}>
                {locationLabel || `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>Destinatario</Text>
        <Text style={styles.hint}>
          Si lo dejas vacío, el mensaje se entenderá dirigido a todo el grupo.
        </Text>
        <TouchableOpacity
          style={styles.selectField}
          onPress={() => setShowDestinatarioList(prev => !prev)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="account-arrow-right" size={20} color="#64748b" />
          <Text style={styles.selectFieldText}>
            {selectedDestinatario?.name || selectedDestinatario?.email || 'Todo el grupo'}
          </Text>
          <MaterialCommunityIcons
            name={showDestinatarioList ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {showDestinatarioList && (
          <View style={styles.optionsList}>
            <TouchableOpacity
              style={[styles.optionItem, !destinatarioId && styles.optionItemActive]}
              onPress={() => {
                setDestinatarioId('');
                setShowDestinatarioList(false);
              }}
            >
              <Text style={[styles.optionText, !destinatarioId && styles.optionTextActive]}>
                Todo el grupo
              </Text>
            </TouchableOpacity>
            {users?.map(user => (
              <TouchableOpacity
                key={user.id}
                style={[styles.optionItem, destinatarioId === user.id && styles.optionItemActive]}
                onPress={() => {
                  setDestinatarioId(user.id);
                  setShowDestinatarioList(false);
                }}
              >
                <Text style={[styles.optionText, destinatarioId === user.id && styles.optionTextActive]}>
                  {user.name || user.email}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.labelRow}>
          <Text style={styles.labelInline}>Descripción (Voz/Texto)</Text>
          <TouchableOpacity
            style={[
              styles.micBtn,
              recorderState.isRecording && styles.micBtnActive,
              audioFile && !recorderState.isRecording && styles.micBtnHasAudio,
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <MaterialCommunityIcons
              name={recorderState.isRecording ? 'stop' : 'microphone'}
              size={20}
              color={recorderState.isRecording || audioFile ? 'white' : '#3b82f6'}
            />
          </TouchableOpacity>
        </View>

        {recorderState.isRecording && (
          <View style={styles.recordingIndicator}>
            <MaterialCommunityIcons name="record" size={16} color="#ef4444" />
            <Text style={styles.recordingText}>
              Grabando: {formatDuration(recorderState.durationMillis)}
            </Text>
          </View>
        )}

        {audioFile && !recorderState.isRecording && (
          <View style={styles.audioAttached}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#10b981" />
            <Text style={styles.audioAttachedText}>Audio grabado: {audioFile.name}</Text>
            <TouchableOpacity onPress={() => setAudioFile(null)}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe el mensaje"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Tipo de mensaje</Text>
        <View style={styles.pickerContainer}>
          {MESSAGE_TYPE_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.pickerItem, messageType === option.value && styles.pickerItemActive]}
              onPress={() => setMessageType(option.value)}
            >
              <Text style={[styles.pickerText, messageType === option.value && styles.pickerTextActive]}>
                {option.label}
                {option.hint ? ` (${option.hint})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {messageType === MessageType.TRAMITE && (
          <>
            <Text style={styles.label}>Tipo de trámite</Text>
            <View style={styles.pickerContainer}>
              {TRAMITE_SUBTYPE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.pickerItem, tramiteSubtype === option.value && styles.pickerItemActive]}
                  onPress={() => setTramiteSubtype(option.value)}
                >
                  <Text style={[styles.pickerText, tramiteSubtype === option.value && styles.pickerTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>¿Cuándo se requiere respuesta?</Text>
        <View style={styles.pickerContainer}>
          {RESPONSE_TIMEFRAME_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[styles.pickerItem, responseTimeframe === option.value && styles.pickerItemActive]}
              onPress={() => setResponseTimeframe(option.value)}
            >
              <Text style={[styles.pickerText, responseTimeframe === option.value && styles.pickerTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.priorityCard}>
          <MaterialCommunityIcons name="flag" size={18} color="#2563eb" />
          <View style={styles.priorityTextContainer}>
            <Text style={styles.priorityTitle}>Prioridad automática: {priorityLabel}</Text>
            <Text style={styles.priorityHint}>
              Se asigna según el plazo de respuesta seleccionado.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.aiBtn}
          onPress={handleAiAutofill}
          disabled={analyzeImage.isPending}
        >
          {analyzeImage.isPending ? (
            <ActivityIndicator color="#3b82f6" />
          ) : (
            <>
              <MaterialCommunityIcons name="camera" size={20} color="#3b82f6" />
              <Text style={styles.aiBtnText}>Escanear con IA (OCR)</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={createTicket.isPending}
        >
          {createTicket.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>Enviar mensaje</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  form: { flex: 1 },
  formContent: { padding: 20, paddingBottom: 40 },
  modeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  modeNew: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  modeContinuation: { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' },
  modeBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  modeNewText: { color: '#2563eb' },
  modeContinuationText: { color: '#7c3aed' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 4, marginTop: 16 },
  labelInline: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  locationTextContainer: { flex: 1 },
  locationTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e40af' },
  locationText: { fontSize: 12, color: '#3b82f6', marginTop: 2 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  micBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#3b82f6',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'white',
  },
  micBtnActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  micBtnHasAudio: { backgroundColor: '#10b981', borderColor: '#10b981' },
  recordingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, backgroundColor: '#fee2e2', padding: 8, borderRadius: 8,
  },
  recordingText: { color: '#ef4444', fontSize: 12, fontWeight: 'bold' },
  audioAttached: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, backgroundColor: '#ecfdf5', padding: 8, borderRadius: 8,
  },
  audioAttachedText: { color: '#10b981', fontSize: 12, fontWeight: '500', flex: 1 },
  pickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickerItem: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  pickerItemActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  pickerText: { fontSize: 12, color: '#6b7280' },
  pickerTextActive: { color: 'white', fontWeight: 'bold' },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    padding: 12, fontSize: 16, backgroundColor: '#f9fafb',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  selectFieldText: { flex: 1, fontSize: 15, color: '#1f2937' },
  optionsList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  optionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionItemActive: { backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextActive: { color: '#2563eb', fontWeight: '600' },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  priorityTextContainer: { flex: 1 },
  priorityTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e40af' },
  priorityHint: { fontSize: 12, color: '#3b82f6', marginTop: 2 },
  submitBtn: {
    backgroundColor: '#3b82f6', padding: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 24,
  },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#3b82f6',
    marginTop: 24, gap: 8,
  },
  aiBtnText: { color: '#3b82f6', fontWeight: 'bold' },
});
