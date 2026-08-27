import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsService, CreateTicketDto } from '../services/tickets.service';

type TicketsQueryParams = {
  includeArchived?: boolean;
  workflowStateId?: string;
  categoryId?: string;
  subcategoryId?: string;
  priority?: string;
  messageType?: string;
  userId?: string;
  destinatarioId?: string;
};

export const useTickets = (params?: TicketsQueryParams & { enabled?: boolean }) => {
  const { enabled = true, ...filters } = params ?? {};
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => ticketsService.findAll(filters),
    enabled,
    staleTime: 20_000,
  });
};

export const useArchivedTickets = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['tickets', { includeArchived: true }],
    queryFn: () => ticketsService.findAll({ includeArchived: true }),
    enabled: options?.enabled ?? true,
    staleTime: 30_000,
  });
};

export const useTicketStats = () => {
  return useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: () => ticketsService.getStats(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

export const useTicket = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () => ticketsService.findById(id),
    enabled: !!id,
  });
};

export const useOpenTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ticketsService.openTicket(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'history'] });
    },
  });
};

export const useCloseTicket = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ticketsService.closeTicket(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'history'] });
    },
  });
};

export const useCreateTicket = (options?: { onSuccess?: () => void; onError?: () => void }) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTicketDto) => ticketsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      options?.onSuccess?.();
    },
    onError: () => {
      options?.onError?.();
    },
  });
};

export const useTicketComments = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'comments'],
    queryFn: () => ticketsService.getComments(id),
    enabled: !!id,
  });
};

export const useCreateTicketComment = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => ticketsService.createComment(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'comments'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'history'] });
    },
  });
};

export const useTicketDocuments = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'documents'],
    queryFn: () => ticketsService.getDocuments(id),
    enabled: !!id,
  });
};

export const useUploadTicketDocument = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) =>
      ticketsService.uploadDocument(id, uri, name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id, 'documents'] });
    },
  });
};

export const useTicketHistory = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'history'],
    queryFn: () => ticketsService.getHistory(id),
    enabled: !!id,
  });
};

export const useSummarizeTicket = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ticketsService.summarize(id),
    onSuccess: (data) => {
      queryClient.setQueryData(['tickets', id, 'summary'], data.summary);
    },
  });
};

export const useAnalyzeTicketImage = () => {
  return useMutation({
    mutationFn: ({ uri, name, type }: { uri: string; name: string; type: string }) =>
      ticketsService.analyzeImage(uri, name, type),
  });
};

export const useTicketSummary = (id: string) => {
  return useQuery({
    queryKey: ['tickets', id, 'summary'],
    queryFn: () => null,
    enabled: false,
  });
};
