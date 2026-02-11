import apiClient from '@/lib/axios';
import { CalculationRequest, CalculationResponse } from '@/types/calculater';

export const performCalculation = async (data: CalculationRequest): Promise<CalculationResponse> => {
    const response = await apiClient.post<CalculationResponse>('/calculations', data);
    return response.data;
};
