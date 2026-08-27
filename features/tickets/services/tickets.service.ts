import api from '@/lib/api';
import { OfflineRepository } from '@/lib/offline-repository';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// En la API legacy de expo-file-system, el enum está disponible
const UploadTypeMultipart = FileSystem.FileSystemUploadType?.MULTIPART ?? 1;

export enum TicketType {
  SOLICITUD = 'SOLICITUD',
  CARTA = 'CARTA',
  OFICIO = 'OFICIO',
  INFORME = 'INFORME',
}

export type TicketPriority = 'BAJA' | 'MEDIA' | 'URGENTE';

export interface TicketResponse {
  id: string;
  title?: string;
  description?: string;
  type?: TicketType;
  categoryId?: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  workflowStateId?: string;
  userId?: string;
  destinatarioId?: string | null;
  workflowState?: {
    id: string;
    name: string;
  };
  statusId?: string;
  statusName?: string;
  categoryName?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt?: string;
  remitenteName?: string;
  destinatarioName?: string;
  priority?: TicketPriority;
  messageType?: string;
  tramiteSubtype?: string;
  responseUrgency?: string;
  fechaLimite?: string;
  locationLabel?: string;
  isArchived?: boolean;
  parentTicketId?: string;
  rootTicketId?: string;
  isContinuation?: boolean;
}

export interface CreateTicketDto {
  title?: string;
  description?: string;
  type?: TicketType;
  destinatarioId?: string;
  categoryId?: string;
  subcategoryId?: string;
  workflowStateId?: string;
  statusId?: string;
  messageType?: string;
  tramiteSubtype?: string;
  responseUrgency?: string;
  priority?: TicketPriority;
  fechaLimite?: string;
  latitude?: number;
  longitude?: number;
  locationLabel?: string;
  parentTicketId?: string;
  audioFile?: {
    uri: string;
    name: string;
    type: string;
  };
}

export interface SmartDocumentDraftDto {
  title: string;
  documentDate?: string;
  responsible?: string;
  description?: string;
  location?: string;
  priority?: string;
  attachmentsSummary?: string;
  tramiteSubtype?: string;
  subcategoryName?: string;
}

export const ticketsService = {
  create: async (data: CreateTicketDto): Promise<TicketResponse | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'CREATE',
      'Ticket',
      null,
      data,
      async () => {
        if (data.audioFile) {
          const token = await SecureStore.getItemAsync('token');
          const baseUrl = api.defaults.baseURL;
          const url = `${baseUrl}/tickets`;

          console.log('[FileSystem] Subiendo ticket con audio via uploadAsync:', url);

          const response = await FileSystem.uploadAsync(url, data.audioFile.uri, {
            httpMethod: 'POST',
            uploadType: UploadTypeMultipart,
            fieldName: 'audio',
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              'Accept': 'application/json',
            },
            parameters: {
              title: data.title || '',
              description: data.description || '',
              categoryId: data.categoryId || '',
              workflowStateId: data.workflowStateId || '',
              ...(data.subcategoryId ? { subcategoryId: data.subcategoryId } : {}),
              ...(data.type ? { type: data.type } : {}),
              ...(data.destinatarioId ? { destinatarioId: data.destinatarioId } : {}),
              ...(data.messageType ? { messageType: data.messageType } : {}),
              ...(data.tramiteSubtype ? { tramiteSubtype: data.tramiteSubtype } : {}),
              ...(data.responseUrgency ? { responseUrgency: data.responseUrgency } : {}),
              ...(data.priority ? { priority: data.priority } : {}),
              ...(data.fechaLimite ? { fechaLimite: data.fechaLimite } : {}),
              ...(data.latitude != null ? { latitude: String(data.latitude) } : {}),
              ...(data.longitude != null ? { longitude: String(data.longitude) } : {}),
              ...(data.locationLabel ? { locationLabel: data.locationLabel } : {}),
              ...(data.parentTicketId ? { parentTicketId: data.parentTicketId } : {}),
            },
          });

          if (response.status < 200 || response.status >= 300) {
            console.error('[FileSystem Error]', response.body);
            throw new Error(response.body);
          }

          return JSON.parse(response.body);
        }

        const { audioFile: _audio, ...payload } = data;
        console.log('[API] Creando ticket con JSON. Payload:', JSON.stringify(payload, null, 2));
        const response = await api.post<TicketResponse>('/tickets', payload);
        return response.data;
      }
    );
  },
  findAll: async (params?: {
    includeArchived?: boolean;
    workflowStateId?: string;
    categoryId?: string;
    subcategoryId?: string;
    priority?: string;
    messageType?: string;
    userId?: string;
    destinatarioId?: string;
    limit?: number;
  }): Promise<TicketResponse[]> => {
    try {
      const response = await api.get<TicketResponse[]>('/tickets', {
        params: {
          ...(params?.includeArchived ? { includeArchived: 'true' } : {}),
          ...(params?.workflowStateId ? { workflowStateId: params.workflowStateId } : {}),
          ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
          ...(params?.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
          ...(params?.priority ? { priority: params.priority } : {}),
          ...(params?.messageType ? { messageType: params.messageType } : {}),
          ...(params?.userId ? { userId: params.userId } : {}),
          ...(params?.destinatarioId ? { destinatarioId: params.destinatarioId } : {}),
          limit: params?.limit ?? 100,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('[API Error] Error al cargar tickets:', error.response?.status, error.message);
      throw error;
    }
  },
  search: async (params: {
    q: string;
    mode?: 'literal' | 'semantic';
    limit?: number;
  }): Promise<TicketResponse[]> => {
    const response = await api.get<TicketResponse[]>('/tickets/search', {
      params: {
        q: params.q,
        mode: params.mode ?? 'semantic',
        limit: params.limit ?? 50,
      },
    });
    return response.data;
  },
  findById: async (id: string): Promise<TicketResponse> => {
    const response = await api.get<TicketResponse>(`/tickets/${id}`);
    return response.data;
  },
  changeStatus: async (id: string, newStateId: string): Promise<void | { offline: boolean }> => {
    return OfflineRepository.executeAction(
      'STATUS_CHANGE',
      'Ticket',
      id,
      { newStateId },
      async () => {
        await api.patch(`/tickets/${id}/status`, { newStateId });
      }
    );
  },
  openTicket: async (id: string): Promise<{ transitioned: boolean }> => {
    const response = await api.post<{ transitioned: boolean }>(`/tickets/${id}/open`);
    return response.data;
  },
  closeTicket: async (id: string): Promise<{ transitioned: boolean }> => {
    const response = await api.post<{ transitioned: boolean }>(`/tickets/${id}/close`);
    return response.data;
  },
  getComments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/comments`);
    return response.data;
  },
  createComment: async (id: string, content: string): Promise<any> => {
    const response = await api.post(`/tickets/${id}/comments`, { content });
    return response.data;
  },
  getDocuments: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/documents`);
    return response.data;
  },
  uploadDocument: async (id: string, fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post(`/tickets/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getHistory: async (id: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${id}/history`);
    return response.data;
  },
  summarize: async (id: string): Promise<{ summary: string }> => {
    const response = await api.post<{ summary: string }>(`/tickets/${id}/summarize`);
    return response.data;
  },
  analyzeImage: async (fileUri: string, fileName: string, fileType: string): Promise<any> => {
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });
    const response = await api.post('/tickets/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  draftSmartDocument: async (data: SmartDocumentDraftDto): Promise<{ content: string }> => {
    const response = await api.post<{ content: string }>('/tickets/smart-document/draft', data);
    return response.data;
  },
  saveSmartDocument: async (
    ticketId: string,
    payload: { content: string; title?: string },
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api.post(`/tickets/${ticketId}/smart-document/save`, payload);
    return response.data;
  },
  generatePdf: async (ticketId: string): Promise<ArrayBuffer> => {
    const response = await api.get(`/tickets/${ticketId}/generate-pdf`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },
  getStats: async (): Promise<{
    dashboard: {
      nuevos: number;
      enProceso: number;
      completados: number;
      cerrados: number;
      cancelados: number;
      vencidos: number;
      overdue: number;
      pending: number;
      nuevosTemas: number;
      continuaciones: number;
    };
    kpis: {
      total: number;
      pending: number;
      completed: number;
      urgent: number;
      avgResponseHours?: number;
    };
    byCategory: { name: string; value: number }[];
    byUser: { name: string; tickets: number }[];
    bySender?: { name: string; value: number }[];
    byRecipient?: { name: string; value: number }[];
    byLocation?: { name: string; value: number }[];
    byPriority: { name: string; value: number }[];
    byMessageType: { name: string; value: number }[];
    evolution: { name: string; creados: number; cerrados: number }[];
    avgResponseHours?: number;
  }> => {
    const response = await api.get('/tickets/stats');
    return response.data;
  },
};
