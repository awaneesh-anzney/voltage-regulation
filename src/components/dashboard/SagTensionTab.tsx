"use client";

import { useState, useMemo } from "react";
import { computeSagTension, getDefaultSagTensionInputs } from "@/lib/sagTensionEngine";
import { SagTensionInspector, SagTensionCanvas } from "@/components/v2/SagTensionModule";

interface SagTensionTabProps {
  onFeedToSCForces?: (data: { fst_kg: number; span_m: number; conductorName: string }) => void;
}

export function SagTensionTab({ onFeedToSCForces }: SagTensionTabProps) {
  const [inputs, setInputs] = useState(getDefaultSagTensionInputs());
  
  const results = useMemo(() => {
    return computeSagTension(inputs);
  }, [inputs]);

  return (
    <div className="flex h-full w-full bg-[#0a0f18] text-slate-200 overflow-hidden">
      {/* Left Sidebar Inspector */}
      <div className="w-[320px] shrink-0 border-r border-white/[0.06] bg-[#0a0f18] overflow-y-auto no-scrollbar">
        <SagTensionInspector 
          inputs={inputs} 
          onUpdateInputs={(p) => setInputs(prev => ({ ...prev, ...p }))} 
          results={results} 
        />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        <SagTensionCanvas 
          inputs={inputs} 
          results={results} 
          onFeedToSCForces={onFeedToSCForces} 
        />
      </div>
    </div>
  );
}
