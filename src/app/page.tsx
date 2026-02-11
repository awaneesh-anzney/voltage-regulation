"use client";

import { Header } from "@/components/calculator/Header";
import { ProjectDetails } from "@/components/calculator/ProjectDetails";
import { TechnicalParameters } from "@/components/calculator/TechnicalParameters";
import { LineSegments } from "@/components/calculator/LineSegments";
import { CalculatorResults } from "@/components/calculator/Results";
import { CalculationHistory } from "@/components/calculator/History";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { CalculatorProvider, useCalculator } from "@/context/CalculatorContext";
import { useCalculation } from "@/hooks/useCalculation";
import { CalculationRequest } from "@/types/calculater";
import { useQueryClient } from "@tanstack/react-query";

function CalculatorContent() {
  const { projectDetails, technicalParams, segments, setCalculationResult } = useCalculator();
  const { mutate, isPending } = useCalculation();
  const queryClient = useQueryClient();

  const handleCalculate = () => {
    const requestData: CalculationRequest = {
      project_name: projectDetails.projectName,
      client_name: projectDetails.clientName,
      supply_point: projectDetails.supplyPoint,
      feeding_point: projectDetails.feedingPoint,
      supply_voltage_kv: Number(technicalParams.voltage),
      current_amps: Number(technicalParams.current),
      conductor_size: String(technicalParams.conductorSize),
      conductor_type: technicalParams.conductorType,
      total_distance_km: Number(technicalParams.distance),
      power_factor: Number(technicalParams.powerFactor),
      diversity_factor: Number(technicalParams.diversityFactor),
      resistance: Number(technicalParams.resistance),
      acceptable_limit: Number(technicalParams.acceptableLimit),
      reactance: Number(technicalParams.reactance),
      consider_reactance: technicalParams.considerReactance,
      segments: segments
        .filter(s => Number(s.distance) > 0 || Number(s.load) > 0)
        .map(s => ({
          length: Number(s.distance),
          power: Number(s.load)
        }))
    };

    mutate(requestData, {
      onSuccess: (data) => {
        setCalculationResult(data);
        queryClient.invalidateQueries({ queryKey: ['history'] });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <Header />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <ProjectDetails />
            <TechnicalParameters />
            <LineSegments />

            <Button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 text-sm tracking-wide"
              onClick={handleCalculate}
              disabled={isPending}
            >
              <Zap className={`mr-2 h-4 w-4 fill-current ${isPending ? 'animate-pulse' : ''}`} />
              {isPending ? "CALCULATING..." : "CALCULATE VOLTAGE REGULATION"}
            </Button>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <CalculatorResults />
            <CalculationHistory />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <CalculatorProvider>
      <CalculatorContent />
    </CalculatorProvider>
  );
}
