import api from '@/lib/api';

export type WorkGroup = {
  id: string;
  name: string;
  identifier: string;
  description?: string | null;
  primaryColor: string;
  members?: Array<{
    id: string;
    roleInGroup: string;
    user: { id: string; name?: string; email: string };
  }>;
  topics?: Array<{
    id: string;
    category: { id: string; name: string };
  }>;
  _count?: { members: number; tickets: number };
};

export const workGroupsService = {
  list: async (): Promise<WorkGroup[]> => {
    const { data } = await api.get<WorkGroup[]>('/work-groups');
    return data;
  },
  getActive: async (): Promise<WorkGroup | null> => {
    const { data } = await api.get<WorkGroup | null>('/work-groups/active');
    return data;
  },
  setActive: async (workGroupId: string) => {
    const { data } = await api.post('/work-groups/active', { workGroupId });
    return data;
  },
  updateContact: async (phone: string) => {
    const { data } = await api.patch('/work-groups/me/contact', { phone });
    return data;
  },
};
