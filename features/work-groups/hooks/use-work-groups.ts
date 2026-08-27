import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workGroupsService } from '../services/work-groups.service';

export const useWorkGroups = () =>
  useQuery({
    queryKey: ['work-groups'],
    queryFn: () => workGroupsService.list(),
  });

export const useActiveWorkGroup = () =>
  useQuery({
    queryKey: ['work-groups', 'active'],
    queryFn: () => workGroupsService.getActive(),
  });

export const useSetActiveWorkGroup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workGroupId: string) => workGroupsService.setActive(workGroupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-groups'] });
      qc.invalidateQueries({ queryKey: ['team-settings'] });
    },
  });
};
