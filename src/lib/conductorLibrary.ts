// Conductor Library — Real-world specifications for IEC 60865-1 SC Force Analysis
// Default: AAC BULL (matches PDF test case & getDefaultInputs())

export interface ConductorSpec {
  name: string;
  type: 'AAC' | 'AAAC' | 'ACSR' | 'HTLS';
  As: number;         // Cross-section area (mm²)
  ds: number;         // Overall diameter (mm)
  mc: number;         // Mass per unit length (kg/m)
  E: number;          // Young's modulus (N/mm²)
  sigma_fin: number;  // Lowest value of σ (N/m²)
  cth: number;        // Thermal expansion coefficient for SC heating (m⁴/A²s)
  ratedCurrent?: number; // Rated current (A)
  // Sag-Tension properties
  uts: number;              // Ultimate tensile strength (kN)
  thermalExpCoeff: number;  // Coefficient of linear thermal expansion (/°C)
  finalModulus?: number;    // Final modulus after creep (N/mm²), undefined = use E
}

export const CONDUCTOR_LIBRARY: ConductorSpec[] = [
  // ═══════════════════════════════════════════════
  // AAC — All Aluminium Conductor
  // ═══════════════════════════════════════════════
  {
    name: 'Wasp',    type: 'AAC',
    As: 100.0,  ds: 13.0,  mc: 0.275,
    E: 56000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 230,
    uts: 15.8, thermalExpCoeff: 23.0e-6,
  },
  {
    name: 'Hornet',  type: 'AAC',
    As: 253.0,  ds: 20.65, mc: 0.695,
    E: 56000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 400,
    uts: 40.0, thermalExpCoeff: 23.0e-6,
  },
  {
    name: 'Bull',    type: 'AAC',
    As: 865.36, ds: 38.25, mc: 2.4,
    E: 54015.0282, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 800,
    uts: 136.8, thermalExpCoeff: 23.0e-6,
  },

  // ═══════════════════════════════════════════════
  // AAAC — All Aluminium Alloy Conductor
  // ═══════════════════════════════════════════════
  {
    name: 'Oak',     type: 'AAAC',
    As: 105.0,  ds: 13.3,  mc: 0.291,
    E: 56000, sigma_fin: 56e6, cth: 0.27e-18, ratedCurrent: 240,
    uts: 29.4, thermalExpCoeff: 23.0e-6,
  },
  {
    name: 'Elm',     type: 'AAAC',
    As: 211.0,  ds: 18.85, mc: 0.584,
    E: 56000, sigma_fin: 56e6, cth: 0.27e-18, ratedCurrent: 370,
    uts: 59.1, thermalExpCoeff: 23.0e-6,
  },
  {
    name: 'Poplar',  type: 'AAAC',
    As: 524.0,  ds: 29.75, mc: 1.452,
    E: 56000, sigma_fin: 56e6, cth: 0.27e-18, ratedCurrent: 650,
    uts: 146.7, thermalExpCoeff: 23.0e-6,
  },

  // ═══════════════════════════════════════════════
  // ACSR — Aluminium Conductor Steel Reinforced
  // ═══════════════════════════════════════════════
  {
    name: 'Rabbit',  type: 'ACSR',
    As: 66.97,  ds: 10.05, mc: 0.236,
    E: 80000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 190,
    uts: 24.7, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Dog',     type: 'ACSR',
    As: 118.5,  ds: 14.15, mc: 0.394,
    E: 79000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 260,
    uts: 41.2, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Panther', type: 'ACSR',
    As: 261.5,  ds: 21.0,  mc: 0.976,
    E: 72000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 430,
    uts: 89.2, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Zebra',   type: 'ACSR',
    As: 484.5,  ds: 28.62, mc: 1.621,
    E: 69000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 600,
    uts: 131.9, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Moose',   type: 'ACSR',
    As: 596.0,  ds: 31.77, mc: 2.004,
    E: 65000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 700,
    uts: 159.7, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Drake',   type: 'ACSR',
    As: 468.5,  ds: 28.14, mc: 1.628,
    E: 69000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 590,
    uts: 125.0, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Cardinal',type: 'ACSR',
    As: 546.0,  ds: 30.38, mc: 1.831,
    E: 66000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 660,
    uts: 145.0, thermalExpCoeff: 19.3e-6,
  },
  {
    name: 'Bluejay', type: 'ACSR',
    As: 636.0,  ds: 32.84, mc: 2.167,
    E: 64000, sigma_fin: 50e6, cth: 0.27e-18, ratedCurrent: 740,
    uts: 170.1, thermalExpCoeff: 19.3e-6,
  },

  // ═══════════════════════════════════════════════
  // HTLS — High Temperature Low Sag
  // ═══════════════════════════════════════════════
  {
    name: 'INVAR',   type: 'HTLS',
    As: 468.0,  ds: 28.1,  mc: 1.620,
    E: 73000, sigma_fin: 50e6, cth: 0.20e-18, ratedCurrent: 900,
    uts: 140.0, thermalExpCoeff: 12.8e-6,
  },
  {
    name: 'GAP',     type: 'HTLS',
    As: 520.0,  ds: 29.5,  mc: 1.800,
    E: 70000, sigma_fin: 50e6, cth: 0.22e-18, ratedCurrent: 950,
    uts: 156.0, thermalExpCoeff: 13.5e-6,
  },
  {
    name: 'ACCC',    type: 'HTLS',
    As: 550.0,  ds: 27.8,  mc: 1.410,
    E: 59000, sigma_fin: 56e6, cth: 0.20e-18, ratedCurrent: 1100,
    uts: 175.0, thermalExpCoeff: 1.6e-6,
  },
];

/** Get all unique conductor types */
export function getConductorTypes(): string[] {
  return [...new Set(CONDUCTOR_LIBRARY.map(c => c.type))];
}

/** Get conductors filtered by type */
export function getConductorsByType(type: string): ConductorSpec[] {
  return CONDUCTOR_LIBRARY.filter(c => c.type === type);
}

/** Find a conductor by name (case-insensitive) */
export function findConductor(name: string): ConductorSpec | undefined {
  return CONDUCTOR_LIBRARY.find(c => c.name.toLowerCase() === name.toLowerCase());
}

/** Get the default conductor (AAC BULL — matches PDF test case) */
export function getDefaultConductor(): ConductorSpec {
  return CONDUCTOR_LIBRARY.find(c => c.name === 'Bull' && c.type === 'AAC')!;
}
