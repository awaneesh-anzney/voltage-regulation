import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '@/service/calculater.service';
import { ProjectsResponse } from '@/types/calculater';

export const useHistory = (skip: number = 0, limit: number = 10) => {
    return useQuery({
        queryKey: ['history', skip, limit],
        queryFn: () => fetchProjects(skip, limit),
    });
};
