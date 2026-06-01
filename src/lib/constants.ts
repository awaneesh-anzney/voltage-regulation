export interface Conductor {
  name: string;
  sizeSqmm: number;
  resistance: number; // Ω/KM at 75°C
  reactance: number;  // Ω/KM at 50Hz
  stranding: string;
  weight: string;
  maxVoltageKv: number; // CEA recommended limit
}

export const STANDARD_VOLTAGES = [11, 33, 66, 132, 220, 400, 765];

export const CONDUCTOR_DATABASE: Record<string, Conductor> = {
  Rabbit: {
    name: "Rabbit",
    sizeSqmm: 50,
    resistance: 0.5426,
    reactance: 0.370,
    stranding: "6/1/3.35",
    weight: "214 kg/km",
    maxVoltageKv: 33,
  },
  Dog: {
    name: "Dog",
    sizeSqmm: 100,
    resistance: 0.2733,
    reactance: 0.315,
    stranding: "6/4.72 + 7/1.57",
    weight: "394 kg/km",
    maxVoltageKv: 66,
  },
  Panther: {
    name: "Panther",
    sizeSqmm: 200,
    resistance: 0.1363,
    reactance: 0.305,
    stranding: "30/7/3.00",
    weight: "974 kg/km",
    maxVoltageKv: 132,
  },
  Zebra: {
    name: "Zebra",
    sizeSqmm: 420,
    resistance: 0.0687,
    reactance: 0.320,
    stranding: "54/7/3.18",
    weight: "1621 kg/km",
    maxVoltageKv: 220,
  },
  Moose: {
    name: "Moose",
    sizeSqmm: 520,
    resistance: 0.0555,
    reactance: 0.330,
    stranding: "54/7/3.53",
    weight: "2001 kg/km",
    maxVoltageKv: 400,
  },
};
