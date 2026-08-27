import api from '@/lib/api';

export interface TeamSettingsResponse {
  id: string;
  displayName: string;
  groupIdentifier: string;
  logoUrl?: string | null;
  primaryColor: string;
}

export interface SubcategoryResponse {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
}

export interface CategoryWithSubcategoriesResponse {
  id: string;
  name: string;
  description?: string;
  subcategories?: SubcategoryResponse[];
}

/** Alias usado por el formulario de mensajes */
export type CategoryResponse = CategoryWithSubcategoriesResponse;

export type UserPreference = {
  id: string;
  userId: string;
  defaultInboxView: string;
  searchMode: string;
  preferredCategoryIds?: string | null;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyWhatsApp: boolean;
  accentColor?: string | null;
};

export const catalogService = {
  getMyPreferences: async (): Promise<UserPreference> => {
    const response = await api.get<UserPreference>('/catalog/me/preferences');
    return response.data;
  },
  updateMyPreferences: async (data: Partial<UserPreference>): Promise<UserPreference> => {
    const response = await api.patch<UserPreference>('/catalog/me/preferences', data);
    return response.data;
  },
  getCategories: async (): Promise<CategoryWithSubcategoriesResponse[]> => {
    const response = await api.get<CategoryWithSubcategoriesResponse[]>('/catalog/categories');
    return response.data;
  },
  getSubcategories: async (): Promise<SubcategoryResponse[]> => {
    const response = await api.get<SubcategoryResponse[]>('/catalog/subcategories');
    return response.data;
  },
  getTeamSettings: async (): Promise<TeamSettingsResponse> => {
    const response = await api.get<TeamSettingsResponse>('/catalog/team-settings');
    return response.data;
  },
  updateTeamSettings: async (data: {
    displayName?: string;
    logoUrl?: string;
    primaryColor?: string;
  }) => {
    const response = await api.patch('/catalog/team-settings', data);
    return response.data;
  },
  createCategory: async (data: { name: string; description?: string }) => {
    const response = await api.post('/catalog/categories', data);
    return response.data;
  },
  createSubcategory: async (data: { name: string; categoryId: string; description?: string }) => {
    const response = await api.post('/catalog/subcategories', data);
    return response.data;
  },
  getWorkflowStates: async (): Promise<{ id: string; name: string; description?: string }[]> => {
    const response = await api.get('/catalog/workflow-states');
    return response.data;
  },
  getUsers: async (): Promise<{ id: string; name: string; email: string; role: string }[]> => {
    const response = await api.get('/catalog/users');
    return response.data;
  },
};
