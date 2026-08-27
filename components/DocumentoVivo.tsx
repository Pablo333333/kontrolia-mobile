import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Linking, Image 
} from 'react-native';
import { 
  useTicketComments, useCreateTicketComment, useTicketDocuments, 
  useUploadTicketDocument, useSummarizeTicket, useTicketSummary, useTicketHistory,
  useCloseTicket,
  useOpenTicket,
} from '../features/tickets/hooks/use-tickets';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

interface DocumentoVivoProps {
  entityId: string;
  entityType: 'TICKET';
}

type TabType = 'chat' | 'docs' | 'history';

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const formatUserName = (user?: { name?: string | null; email?: string }) =>
  user?.name?.trim() || user?.email || 'Usuario';

const formatDateTime = (value: string | Date) =>
  new Date(value).toLocaleString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

const isVideoDoc = (type?: string, name?: string) => {
  const mime = type?.toLowerCase() ?? '';
  const fileName = name?.toLowerCase() ?? '';
  return mime.startsWith('video/') || !!fileName.match(/\.(mp4|mov|webm|m4v|avi|mkv)$/);
};

const isImageDoc = (type?: string, name?: string) => {
  const mime = type?.toLowerCase() ?? '';
  const fileName = name?.toLowerCase() ?? '';
  return mime.startsWith('image/') || !!fileName.match(/\.(jpg|jpeg|png|webp|gif)$/);
};

const getDocIcon = (type?: string, name?: string) => {
  if (isVideoDoc(type, name)) return 'video';
  if (isImageDoc(type, name)) return 'file-image';
  const mime = type?.toLowerCase() ?? '';
  const fileName = name?.toLowerCase() ?? '';
  if (mime.includes('pdf') || fileName.endsWith('.pdf')) return 'file-pdf-box';
  if (mime.startsWith('audio/')) return 'file-music';
  return 'file-document-outline';
};

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const API_URL = process.env.EXPO_PUBLIC_API_URL || '';

export const DocumentoVivo: React.FC<DocumentoVivoProps> = ({ entityId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    const socket: Socket = io(API_URL);
    socket.on('connect', () => socket.emit('joinRoom', { roomId: entityId }));
    socket.on('messageReceived', () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId, 'comments'] });
    });
    socket.on('statusChanged', () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId] });
      queryClient.invalidateQueries({ queryKey: ['tickets', entityId, 'history'] });
    });
    return () => {
      socket.emit('leaveRoom', { roomId: entityId });
      socket.disconnect();
    };
  }, [entityId, queryClient]);

  const commentsQuery = useTicketComments(entityId);
  const createCommentMutation = useCreateTicketComment(entityId);
  const documentsQuery = useTicketDocuments(entityId);
  const uploadDocumentMutation = useUploadTicketDocument(entityId);
  const summarizeMutation = useSummarizeTicket(entityId);
  const summaryQuery = useTicketSummary(entityId);
  const historyQuery = useTicketHistory(entityId);
  const closeTicketMutation = useCloseTicket(entityId);
  const openTicketMutation = useOpenTicket();

  useEffect(() => {
    openTicketMutation.mutate(entityId);
  }, [entityId]);

  const handleSendComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment.trim(), {
      onSuccess: () => setNewComment(''),
      onError: () => Alert.alert('Error', 'No se pudo enviar el mensaje'),
    });
  };

  const handleOkFin = () => {
    Alert.alert('Confirmar cierre', '¿Deseas marcar este tema como cerrado (OK fin)?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'OK fin',
        onPress: () => {
          closeTicketMutation.mutate(undefined, {
            onSuccess: () => Alert.alert('Cerrado', 'El mensaje fue marcado como cerrado.'),
            onError: () => Alert.alert('Error', 'No se pudo cerrar el mensaje'),
          });
        },
      },
    ]);
  };

  const handleUpload = (payload: { uri: string; name: string; type: string }) => {
    uploadDocumentMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Archivo adjuntado correctamente');
        setActiveTab('docs');
      },
      onError: () => Alert.alert('Error', 'No se pudo subir el archivo'),
    });
  };

  const assertFileSizeOk = async (uri: string, isVideo: boolean) => {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && 'size' in info && typeof info.size === 'number' && info.size > MAX_VIDEO_BYTES) {
        Alert.alert(
          'Archivo demasiado grande',
          `El ${isVideo ? 'video' : 'archivo'} supera el límite de 50 MB (${formatBytes(info.size)}).`,
        );
        return false;
      }
    } catch {}
    return true;
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'application/octet-stream';
        if (!(await assertFileSizeOk(asset.uri, mime.startsWith('video/')))) return;
        handleUpload({ uri: asset.uri, name: asset.name, type: mime });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita permiso para acceder a la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        handleUpload({
          uri: asset.uri,
          name: asset.uri.split('/').pop() || 'photo.jpg',
          type: 'image/jpeg',
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para adjuntar videos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.7,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (!(await assertFileSizeOk(asset.uri, true))) return;
        handleUpload({
          uri: asset.uri,
          name: asset.fileName || `video-${Date.now()}.mp4`,
          type: asset.mimeType || 'video/mp4',
        });
      }
    } catch {
      Alert.alert('Error', 'No se pudo seleccionar el video');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="creation" size={20} color="#3b82f6" />
            <Text style={styles.summaryTitle}>Resumen Inteligente</Text>
          </View>
          <TouchableOpacity onPress={() => summarizeMutation.mutate()} disabled={summarizeMutation.isPending}>
            {summarizeMutation.isPending ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.summaryText}>
          {summaryQuery.data || 'Solicita un resumen para analizar este documento vivo.'}
        </Text>
        <TouchableOpacity
          style={styles.smartDocBtn}
          onPress={() => router.push({ pathname: '/smart-document', params: { ticketId: entityId } })}
        >
          <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#2563eb" />
          <Text style={styles.smartDocBtnText}>Documento automático / Redacción inteligente</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {(['chat', 'docs', 'history'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialCommunityIcons
              name={tab === 'chat' ? 'message-text' : tab === 'docs' ? 'file-document' : 'history'}
              size={20}
              color={activeTab === tab ? '#3b82f6' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'chat' ? 'Chat' : tab === 'docs' ? 'Docs' : 'Historial'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'chat' && (
          <View style={styles.chatContainer}>
            {commentsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 20 }} />
            ) : !commentsQuery.data?.length ? (
              <Text style={styles.emptyText}>Aún no hay mensajes en esta conversación.</Text>
            ) : (
              commentsQuery.data.map((comment: any) => (
                <View key={comment.id} style={styles.commentBubble}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>{formatUserName(comment.user)}</Text>
                    <Text style={styles.commentDate}>{formatDateTime(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'docs' && (
          <View style={styles.docsContainer}>
            {documentsQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : !documentsQuery.data?.length ? (
              <Text style={styles.emptyText}>No hay archivos adjuntos.</Text>
            ) : (
              documentsQuery.data.map((doc: any) => {
                const video = isVideoDoc(doc.type, doc.name);
                const image = isImageDoc(doc.type, doc.name);
                return (
                  <View key={doc.id} style={styles.docItem}>
                    {image && doc.url ? (
                      <Image source={{ uri: doc.url }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.mediaIcon, video && styles.videoIconBg]}>
                        <MaterialCommunityIcons
                          name={getDocIcon(doc.type, doc.name) as any}
                          size={28}
                          color={video ? '#7c3aed' : '#3b82f6'}
                        />
                      </View>
                    )}
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                      <Text style={styles.docDate}>
                        {formatDateTime(doc.createdAt)}{video ? ' · Video' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={video ? styles.playBtn : styles.viewBtn}
                      onPress={() => doc.url && Linking.openURL(doc.url)}
                    >
                      {video ? (
                        <>
                          <MaterialCommunityIcons name="play-circle" size={20} color="#7c3aed" />
                          <Text style={styles.playBtnText}>Reproducir</Text>
                        </>
                      ) : (
                        <Text style={styles.viewBtnText}>Ver</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.historyContainer}>
            {historyQuery.isLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : !historyQuery.data?.length ? (
              <Text style={styles.emptyText}>No hay cambios de estado registrados.</Text>
            ) : (
              historyQuery.data.map((entry: any) => (
                <View key={entry.id} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle}>
                      {entry.oldStateName || 'Inicio'} → {entry.newStateName || 'Estado'}
                    </Text>
                    <Text style={styles.historyMeta}>
                      Por {entry.userName || formatUserName(entry.user)} • {formatDateTime(entry.timestamp)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {activeTab === 'chat' && (
        <>
          <View style={styles.okFinRow}>
            <TouchableOpacity style={styles.okFinBtn} onPress={handleOkFin} disabled={closeTicketMutation.isPending}>
              <MaterialCommunityIcons name="check-circle-outline" size={18} color="#10b981" />
              <Text style={styles.okFinText}>OK fin — expresar conformidad y cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() =>
                router.push({
                  pathname: '/new-ticket',
                  params: { parentTicketId: entityId, mode: 'continuation' },
                })
              }
            >
              <MaterialCommunityIcons name="source-branch" size={18} color="#7c3aed" />
              <Text style={styles.continueBtnText}>Continuar tema (nueva réplica)</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe un mensaje..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <View style={styles.inputActions}>
              <TouchableOpacity onPress={handlePickImage} style={styles.actionBtn}>
                <MaterialCommunityIcons name="camera" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickVideo} style={styles.actionBtn}>
                <MaterialCommunityIcons name="video" size={24} color="#7c3aed" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handlePickDocument} style={styles.actionBtn}>
                <MaterialCommunityIcons name="paperclip" size={24} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendComment}
                style={[styles.sendBtn, !newComment.trim() && styles.sendBtnDisabled]}
                disabled={!newComment.trim() || createCommentMutation.isPending}
              >
                <MaterialCommunityIcons name="send" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  summaryCard: { margin: 16, padding: 16, backgroundColor: '#eff6ff', borderRadius: 12, borderWidth: 1, borderColor: '#dbeafe' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  summaryTitle: { marginLeft: 8, fontWeight: 'bold', color: '#1e40af' },
  summaryText: { fontSize: 13, color: '#1e40af', fontStyle: 'italic' },
  smartDocBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 8 },
  smartDocBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  activeTabText: { color: '#3b82f6', fontWeight: '700' },
  content: { flex: 1 },
  chatContainer: { padding: 16 },
  emptyText: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
  commentBubble: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  commentUser: { fontWeight: '700', fontSize: 12, color: '#1f2937' },
  commentDate: { fontSize: 10, color: '#9ca3af' },
  commentText: { fontSize: 14, color: '#374151' },
  docsContainer: { padding: 16 },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', gap: 10 },
  thumb: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#e5e7eb' },
  mediaIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  videoIconBg: { backgroundColor: '#f5f3ff' },
  docInfo: { flex: 1 },
  docName: { fontWeight: '600', color: '#111827', fontSize: 14 },
  docDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  viewBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#eff6ff', borderRadius: 8 },
  viewBtnText: { color: '#2563eb', fontWeight: '600', fontSize: 12 },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#f5f3ff', borderRadius: 8 },
  playBtnText: { color: '#7c3aed', fontWeight: '700', fontSize: 12 },
  historyContainer: { padding: 16 },
  historyItem: { flexDirection: 'row', marginBottom: 16 },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6', marginTop: 4, marginRight: 12 },
  historyContent: { flex: 1 },
  historyTitle: { fontWeight: '600', color: '#111827', fontSize: 13 },
  historyMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  okFinRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  okFinBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ecfdf5', padding: 10, borderRadius: 10 },
  okFinText: { color: '#059669', fontWeight: '600', fontSize: 12, flex: 1 },
  continueBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f5f3ff', padding: 10, borderRadius: 10 },
  continueBtnText: { color: '#7c3aed', fontWeight: '600', fontSize: 12, flex: 1 },
  inputContainer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 12 },
  input: { minHeight: 44, maxHeight: 100, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: '#f9fafb' },
  inputActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  actionBtn: { padding: 6 },
  sendBtn: { backgroundColor: '#3b82f6', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
