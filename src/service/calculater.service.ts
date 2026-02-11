import apiClient from '@/lib/axios';
import { CalculationRequest, CalculationResponse, ProjectsResponse } from '@/types/calculater';

export const performCalculation = async (data: CalculationRequest): Promise<CalculationResponse> => {
    const response = await apiClient.post<CalculationResponse>('/calculations', data);
    return response.data;
};

export const fetchProjects = async (skip: number = 0, limit: number = 10): Promise<ProjectsResponse> => {
    const response = await apiClient.get<ProjectsResponse>(`/projects/?skip=${skip}&limit=${limit}`);
    return response.data;
};
