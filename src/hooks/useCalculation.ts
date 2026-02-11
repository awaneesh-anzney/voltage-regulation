import { useMutation } from '@tanstack/react-query';
import { performCalculation } from '@/service/calculater.service';
import { CalculationRequest, CalculationResponse } from '@/types/calculater';

export const useCalculation = () => {
    return useMutation({
        mutationFn: (data: CalculationRequest) => performCalculation(data),
    });
};
