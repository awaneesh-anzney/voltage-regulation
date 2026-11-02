// Rigid Tubular Aluminium Busbar Library
// Guaranteed Technical Parameters (GTP) for Schedule 80 & 80EH Aluminium Tube
// Material: Aluminium Alloy 6101 T6 conforming to 63401 WP (range 2) of IS 5082 : 1998

export interface BusBarSpec {
  name: string;
  nominalSize: string;
  schedule: string;
  material: string;
  outerDiameter: number; // mm
  wallThickness: number; // mm
  crossSectionArea: number; // mm²
  weight: number; // kg/m
  momentOfInertia: number; // mm⁴
  sectionModulus: number; // mm³
  minUTS: number; // N/mm² (converted from 20.5 kg/sq.mm)
  alpha20: number; // per °C (0.00364)
  conductivityIACS: number; // % IACS (55)
  conductivityMSm: number; // MS/m (31.9)
  dcResistanceAt20C: number; // Ω/m
  linearThermalExpansion: number; // per °C (0.000023)
  modulusOfElasticity: number; // N/mm² (6700 kg/sq.mm = 65,704.5 N/mm²)
  minProofStress02: number; // N/mm² (17.34 kg/sq.mm = 170.05 N/mm²)
  minElongation50mm: number; // % (10)
  sourceStatus: 'VERIFIED_GTP_SPEC';
}

// 55% IACS resistivity at 20°C = 1 / (0.55 * 58e6) = 3.1348e-8 Ω·m = 0.031348 Ω·mm²/m
const RHO_AL_6101_20C = 0.031348; // Ω·mm²/m

export const BUSBAR_TUBE_LIBRARY: BusBarSpec[] = [
  {
    name: '3" IPS AL Tube (EH Type)',
    nominalSize: '3" IPS',
    schedule: 'Schedule 80EH',
    material: 'Aluminium Alloy 6101 T6 (IS 5082:1998)',
    outerDiameter: 88.90,
    wallThickness: 7.62,
    crossSectionArea: 1945.76,
    weight: 5.25,
    momentOfInertia: 1621589.99,
    sectionModulus: 36481.21,
    minUTS: 201.04, // 20.5 kg/mm² * 9.80665
    alpha20: 0.00364,
    conductivityIACS: 55,
    conductivityMSm: 31.9,
    dcResistanceAt20C: RHO_AL_6101_20C / 1945.76, // ~1.611e-5 Ω/m
    linearThermalExpansion: 0.000023,
    modulusOfElasticity: 65704.5,
    minProofStress02: 170.05,
    minElongation50mm: 10,
    sourceStatus: 'VERIFIED_GTP_SPEC'
  },
  {
    name: '4" IPS AL Tube (EH Type)',
    nominalSize: '4" IPS',
    schedule: 'Schedule 80EH',
    material: 'Aluminium Alloy 6101 T6 (IS 5082:1998)',
    outerDiameter: 114.2,
    wallThickness: 8.51,
    crossSectionArea: 2825.61,
    weight: 7.7,
    momentOfInertia: 3972577.97,
    sectionModulus: 69572.29,
    minUTS: 201.04,
    alpha20: 0.00364,
    conductivityIACS: 55,
    conductivityMSm: 31.9,
    dcResistanceAt20C: RHO_AL_6101_20C / 2825.61, // ~1.109e-5 Ω/m
    linearThermalExpansion: 0.000023,
    modulusOfElasticity: 65704.5,
    minProofStress02: 170.05,
    minElongation50mm: 10,
    sourceStatus: 'VERIFIED_GTP_SPEC'
  },
  {
    name: '4.5" IPS AL Tube (EH Type)',
    nominalSize: '4.5" IPS',
    schedule: 'Schedule 80EH',
    material: 'Aluminium Alloy 6101 T6 (IS 5082:1998)',
    outerDiameter: 120.0,
    wallThickness: 12.0,
    crossSectionArea: 4071.50,
    weight: 10.993,
    momentOfInertia: 6011958.58,
    sectionModulus: 100199.31,
    minUTS: 201.04,
    alpha20: 0.00364,
    conductivityIACS: 55,
    conductivityMSm: 31.9,
    dcResistanceAt20C: RHO_AL_6101_20C / 4071.50, // ~7.699e-6 Ω/m
    linearThermalExpansion: 0.000023,
    modulusOfElasticity: 65704.5,
    minProofStress02: 170.05,
    minElongation50mm: 10,
    sourceStatus: 'VERIFIED_GTP_SPEC'
  },
  {
    name: '5" IPS AL Tube',
    nominalSize: '5" IPS',
    schedule: 'Schedule 80',
    material: 'Aluminium Alloy 6101 T6 (IS 5082:1998)',
    outerDiameter: 141.3,
    wallThickness: 9.53,
    crossSectionArea: 3945.11,
    weight: 10.652,
    momentOfInertia: 8610787.65,
    sectionModulus: 121879.51,
    minUTS: 201.04,
    alpha20: 0.00364,
    conductivityIACS: 55,
    conductivityMSm: 31.9,
    dcResistanceAt20C: RHO_AL_6101_20C / 3945.11, // ~7.946e-6 Ω/m
    linearThermalExpansion: 0.000023,
    modulusOfElasticity: 65704.5,
    minProofStress02: 170.05,
    minElongation50mm: 10,
    sourceStatus: 'VERIFIED_GTP_SPEC'
  }
];

export function findBusBar(name: string): BusBarSpec | undefined {
  return BUSBAR_TUBE_LIBRARY.find(b => b.name.toLowerCase() === name.toLowerCase());
}

