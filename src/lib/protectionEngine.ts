export type IEC_CURVE_TYPE = 'SI' | 'VI' | 'EI';

export interface RelaySettings {
  curveType: IEC_CURVE_TYPE;
  tms: number; // Time Multiplier Setting
  psm: number; // Plug Setting Multiplier (pickup current)
}

export interface ProtectionInputs {
  faultCurrentA: number;
  upstreamRelay: RelaySettings;
  downstreamRelay: RelaySettings;
}

export interface RelayResult {
  tripTimeS: number;
  curvePoints: { currentA: number; timeS: number }[]; // For plotting
}

export interface ProtectionResults {
  upstream: RelayResult;
  downstream: RelayResult;
  discriminationMarginS: number;
  isCoordinated: boolean;
}

// IEC 60255 constants
const CURVE_CONSTANTS = {
  SI: { k: 0.14, a: 0.02 }, // Standard Inverse
  VI: { k: 13.5, a: 1.0 },  // Very Inverse
  EI: { k: 80.0, a: 2.0 },  // Extremely Inverse
};

export function calculateTripTime(curveType: IEC_CURVE_TYPE, tms: number, psm: number, currentA: number): number {
  const { k, a } = CURVE_CONSTANTS[curveType];
  const I_Is = currentA / psm;
  
  // If current is below pickup, trip time is infinite (doesn't trip)
  if (I_Is <= 1) return Infinity;
  
  return tms * (k / (Math.pow(I_Is, a) - 1));
}

export function generateCurvePoints(curveType: IEC_CURVE_TYPE, tms: number, psm: number, maxCurrentA: number): { currentA: number; timeS: number }[] {
  const points = [];
  // Generate points from 1.1x PSM to maxCurrentA
  const startCurrent = psm * 1.1;
  const step = (maxCurrentA - startCurrent) / 50;
  
  for (let i = 0; i <= 50; i++) {
    const I = startCurrent + i * step;
    const t = calculateTripTime(curveType, tms, psm, I);
    points.push({ currentA: I, timeS: t });
  }
  return points;
}

export function calculateProtection(inputs: ProtectionInputs): ProtectionResults {
  const upTrip = calculateTripTime(inputs.upstreamRelay.curveType, inputs.upstreamRelay.tms, inputs.upstreamRelay.psm, inputs.faultCurrentA);
  const downTrip = calculateTripTime(inputs.downstreamRelay.curveType, inputs.downstreamRelay.tms, inputs.downstreamRelay.psm, inputs.faultCurrentA);
  
  const margin = upTrip - downTrip;
  
  // Typical required discrimination margin is 0.2s to 0.4s
  const isCoordinated = margin >= 0.2 && margin <= 0.6;
  
  // Max current for plotting, typically up to the fault current or a bit beyond
  const plotMax = Math.max(inputs.faultCurrentA * 1.5, inputs.upstreamRelay.psm * 20);

  return {
    upstream: {
      tripTimeS: upTrip,
      curvePoints: generateCurvePoints(inputs.upstreamRelay.curveType, inputs.upstreamRelay.tms, inputs.upstreamRelay.psm, plotMax)
    },
    downstream: {
      tripTimeS: downTrip,
      curvePoints: generateCurvePoints(inputs.downstreamRelay.curveType, inputs.downstreamRelay.tms, inputs.downstreamRelay.psm, plotMax)
    },
    discriminationMarginS: margin,
    isCoordinated
  };
}

export function getDefaultProtectionInputs(): ProtectionInputs {
  return {
    faultCurrentA: 5000,
    upstreamRelay: {
      curveType: 'SI',
      tms: 0.5,
      psm: 800, // 800A primary pickup
    },
    downstreamRelay: {
      curveType: 'SI',
      tms: 0.1,
      psm: 400, // 400A primary pickup
    }
  };
}
