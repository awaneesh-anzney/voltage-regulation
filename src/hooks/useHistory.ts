import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, deleteProject } from '@/service/calculater.service';
import { ProjectsResponse } from '@/types/calculater';

export const useHistory = (skip: number = 0, limit: number = 10) => {
    return useQuery({
        queryKey: ['history', skip, limit],
        queryFn: () => fetchProjects(skip, limit),
    });
};

export const useDeleteHistory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteProject(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['history'] });
        },
    });
};
