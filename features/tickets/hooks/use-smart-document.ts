import { useMutation } from '@tanstack/react-query';
import { ticketsService, SmartDocumentDraftDto } from '../services/tickets.service';

export const useDraftSmartDocument = () => {
  return useMutation({
    mutationFn: (data: SmartDocumentDraftDto) => ticketsService.draftSmartDocument(data),
  });
};

export const useSaveSmartDocument = (ticketId: string) => {
  return useMutation({
    mutationFn: (payload: { content: string; title?: string }) =>
      ticketsService.saveSmartDocument(ticketId, payload),
  });
};

export const useGenerateTicketPdf = (ticketId: string) => {
  return useMutation({
    mutationFn: () => ticketsService.generatePdf(ticketId),
  });
};
