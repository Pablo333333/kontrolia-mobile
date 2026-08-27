import { useQuery } from '@tanstack/react-query';
import { catalogService } from '../services/catalog.service';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: catalogService.getCategories,
  });
};

export const useSubcategories = () => {
  return useQuery({
    queryKey: ['subcategories'],
    queryFn: catalogService.getSubcategories,
  });
};

export const useTeamSettings = () => {
  return useQuery({
    queryKey: ['team-settings'],
    queryFn: catalogService.getTeamSettings,
  });
};

export const useWorkflowStates = () => {
  return useQuery({
    queryKey: ['workflow-states'],
    queryFn: catalogService.getWorkflowStates,
  });
};

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: catalogService.getUsers,
  });
};

export const useMyPreferences = () => {
  return useQuery({
    queryKey: ['my-preferences'],
    queryFn: catalogService.getMyPreferences,
  });
};
