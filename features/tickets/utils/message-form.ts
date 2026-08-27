import { CategoryWithSubcategoriesResponse as CategoryResponse } from '@/features/catalog/services/catalog.service';

export type ResponseTimeframe = 'MOMENTO' | 'DIA' | 'DOS_DIAS' | 'MAS_DOS_DIAS';

export enum MessageType {
  COORDINACION = 'COORDINACION',
  TRAMITE = 'TRAMITE',
  DOCUMENTOS_TECNICOS = 'DOCUMENTOS_TECNICOS',
  CONVENIOS = 'CONVENIOS',
}

export enum TramiteSubtype {
  CARTA = 'CARTA',
  OFICIO = 'OFICIO',
  SOLICITUD = 'SOLICITUD',
}

export type TicketPriority = 'BAJA' | 'MEDIA' | 'URGENTE';

export const MESSAGE_TYPE_OPTIONS: { value: MessageType; label: string; hint?: string }[] = [
  { value: MessageType.COORDINACION, label: 'Coordinación', hint: 'chat' },
  { value: MessageType.TRAMITE, label: 'Trámite' },
  { value: MessageType.DOCUMENTOS_TECNICOS, label: 'Documentos técnicos' },
  { value: MessageType.CONVENIOS, label: 'Convenios' },
];

export const TRAMITE_SUBTYPE_OPTIONS: { value: TramiteSubtype; label: string }[] = [
  { value: TramiteSubtype.CARTA, label: 'Carta' },
  { value: TramiteSubtype.OFICIO, label: 'Oficio' },
  { value: TramiteSubtype.SOLICITUD, label: 'Solicitud' },
];

export const RESPONSE_TIMEFRAME_OPTIONS: {
  value: ResponseTimeframe;
  label: string;
  priorityLabel: string;
}[] = [
  { value: 'MOMENTO', label: 'Para el momento', priorityLabel: 'Muy alta' },
  { value: 'DIA', label: 'Para el día', priorityLabel: 'Alta' },
  { value: 'DOS_DIAS', label: 'Para 2 días', priorityLabel: 'Media' },
  { value: 'MAS_DOS_DIAS', label: 'Después de 2 días', priorityLabel: 'Baja' },
];

const CATEGORY_PATTERNS: Record<MessageType, RegExp[]> = {
  [MessageType.COORDINACION]: [/coordin/i, /chat/i, /soporte/i],
  [MessageType.TRAMITE]: [/tramite/i, /document/i],
  [MessageType.DOCUMENTOS_TECNICOS]: [/tecnic/i, /obra/i, /ingenier/i],
  [MessageType.CONVENIOS]: [/convenio/i, /acuerdo/i],
};

const SUBCATEGORY_BY_MESSAGE_TYPE: Record<MessageType, RegExp[]> = {
  [MessageType.COORDINACION]: [/coordin/i, /chat/i],
  [MessageType.TRAMITE]: [/tramite/i],
  [MessageType.DOCUMENTOS_TECNICOS]: [/tecnic/i, /obra/i],
  [MessageType.CONVENIOS]: [/convenio/i, /acuerdo/i],
};

const SUBCATEGORY_BY_TRAMITE: Record<TramiteSubtype, RegExp[]> = {
  [TramiteSubtype.CARTA]: [/carta/i],
  [TramiteSubtype.OFICIO]: [/oficio/i],
  [TramiteSubtype.SOLICITUD]: [/solic/i],
};

export function resolveCategoryId(
  messageType: MessageType,
  categories: CategoryResponse[],
): string | undefined {
  if (!categories.length) return undefined;

  const patterns = CATEGORY_PATTERNS[messageType];
  const match = categories.find(cat =>
    patterns.some(pattern => pattern.test(cat.name) || pattern.test(cat.description ?? '')),
  );

  return match?.id ?? categories[0].id;
}

export function resolveSubcategoryId(
  category: CategoryResponse | undefined,
  messageType: MessageType,
  tramiteSubtype?: TramiteSubtype,
  title?: string,
): string | undefined {
  const subs = category?.subcategories ?? [];
  if (!subs.length) return undefined;

  const searchable = (s: { name: string; description?: string }) =>
    `${s.name} ${s.description ?? ''}`;

  if (messageType === MessageType.TRAMITE && tramiteSubtype) {
    const patterns = SUBCATEGORY_BY_TRAMITE[tramiteSubtype];
    const bySubtype = subs.find(s => patterns.some(p => p.test(searchable(s))));
    if (bySubtype) return bySubtype.id;
  }

  const typePatterns = SUBCATEGORY_BY_MESSAGE_TYPE[messageType];
  const byType = subs.find(s => typePatterns.some(p => p.test(searchable(s))));
  if (byType) return byType.id;

  if (title?.trim()) {
    const lower = title.trim().toLowerCase();
    const byTitle = subs.find(s => {
      const name = s.name.toLowerCase();
      return lower.includes(name) || name.includes(lower);
    });
    if (byTitle) return byTitle.id;
  }

  return subs[0].id;
}

export function composeCategoryTitle(
  categoryName?: string,
  subcategoryName?: string,
  userTitle?: string,
): string {
  if (!categoryName) return userTitle?.trim() || '';
  const base = subcategoryName ? `${categoryName} — ${subcategoryName}` : categoryName;
  const trimmed = userTitle?.trim();
  if (!trimmed) return base;
  if (trimmed.toLowerCase().includes(categoryName.toLowerCase())) return trimmed;
  if (trimmed.startsWith(`${categoryName} —`)) return trimmed;
  return `${base}: ${trimmed}`;
}

export function computePriorityFromTimeframe(timeframe: ResponseTimeframe): TicketPriority {
  switch (timeframe) {
    case 'MOMENTO':
    case 'DIA':
      return 'URGENTE';
    case 'DOS_DIAS':
      return 'MEDIA';
    case 'MAS_DOS_DIAS':
      return 'BAJA';
  }
}

export function getPriorityDisplayLabel(timeframe: ResponseTimeframe): string {
  return RESPONSE_TIMEFRAME_OPTIONS.find(o => o.value === timeframe)?.priorityLabel ?? 'Baja';
}

export function computeFechaLimite(timeframe: ResponseTimeframe): Date {
  const now = new Date();

  switch (timeframe) {
    case 'MOMENTO':
      return now;
    case 'DIA': {
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }
    case 'DOS_DIAS': {
      const twoDays = new Date(now);
      twoDays.setDate(twoDays.getDate() + 2);
      twoDays.setHours(23, 59, 59, 999);
      return twoDays;
    }
    case 'MAS_DOS_DIAS': {
      const later = new Date(now);
      later.setDate(later.getDate() + 3);
      later.setHours(23, 59, 59, 999);
      return later;
    }
  }
}
