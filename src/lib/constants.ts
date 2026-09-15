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
  // Additional ACSR
  Squirrel: {
    name: "Squirrel",
    sizeSqmm: 20,
    resistance: 1.374,
    reactance: 0.380,
    stranding: "6/1/2.11",
    weight: "85 kg/km",
    maxVoltageKv: 11,
  },
  Weasel: {
    name: "Weasel",
    sizeSqmm: 30,
    resistance: 0.908,
    reactance: 0.350,
    stranding: "6/1/2.59",
    weight: "128 kg/km",
    maxVoltageKv: 11,
  },
  Raccoon: {
    name: "Raccoon",
    sizeSqmm: 80,
    resistance: 0.371,
    reactance: 0.320,
    stranding: "6/1/4.09",
    weight: "318 kg/km",
    maxVoltageKv: 33,
  },
  Wolf: {
    name: "Wolf",
    sizeSqmm: 150,
    resistance: 0.183,
    reactance: 0.310,
    stranding: "30/7/2.59",
    weight: "726 kg/km",
    maxVoltageKv: 132,
  },
  Bersimis: {
    name: "Bersimis",
    sizeSqmm: 680,
    resistance: 0.042,
    reactance: 0.315,
    stranding: "42/7/4.57",
    weight: "2350 kg/km",
    maxVoltageKv: 400,
  },
  // AAAC (All Aluminium Alloy Conductors)
  "AAAC Wolf Eq": {
    name: "AAAC Wolf Eq.",
    sizeSqmm: 173,
    resistance: 0.191,
    reactance: 0.301,
    stranding: "19/3.40",
    weight: "477 kg/km",
    maxVoltageKv: 132,
  },
  "AAAC Panther Eq": {
    name: "AAAC Panther Eq.",
    sizeSqmm: 232,
    resistance: 0.144,
    reactance: 0.295,
    stranding: "19/3.95",
    weight: "643 kg/km",
    maxVoltageKv: 132,
  },
  "AAAC Zebra Eq": {
    name: "AAAC Zebra Eq.",
    sizeSqmm: 466,
    resistance: 0.071,
    reactance: 0.300,
    stranding: "61/3.12",
    weight: "1293 kg/km",
    maxVoltageKv: 220,
  },
  "AAAC Moose Eq": {
    name: "AAAC Moose Eq.",
    sizeSqmm: 573,
    resistance: 0.058,
    reactance: 0.306,
    stranding: "61/3.46",
    weight: "1588 kg/km",
    maxVoltageKv: 400,
  },
  // HTLS & High-Performance (INVAR, ACCC, AL59)
  "AL59 Zebra": {
    name: "AL59 Zebra",
    sizeSqmm: 420,
    resistance: 0.057,
    reactance: 0.315,
    stranding: "54/7/3.18",
    weight: "1200 kg/km",
    maxVoltageKv: 220,
  },
  "ACCC Drake (HTLS)": {
    name: "ACCC Drake",
    sizeSqmm: 434,
    resistance: 0.065,
    reactance: 0.310,
    stranding: "Trapezoidal",
    weight: "1100 kg/km",
    maxVoltageKv: 220,
  },
  "HTLS INVAR Zebra": {
    name: "INVAR Zebra (HTLS)",
    sizeSqmm: 420,
    resistance: 0.068,
    reactance: 0.315,
    stranding: "54/7/3.18",
    weight: "1650 kg/km",
    maxVoltageKv: 220,
  },
  "HTLS AL59 Moose": {
    name: "AL59 Moose (HTLS)",
    sizeSqmm: 520,
    resistance: 0.046,
    reactance: 0.320,
    stranding: "54/7/3.53",
    weight: "1850 kg/km",
    maxVoltageKv: 400,
  }
};
