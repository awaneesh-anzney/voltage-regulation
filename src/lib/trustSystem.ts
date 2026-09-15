// Trust Indicator System for SC Forces results
// Maps each computed value to a confidence level based on engine verification status

export type TrustLevel = 'verified' | 'approximate' | 'unverified';

export interface TrustBadge {
  level: TrustLevel;
  label: string;    // Short label (V, A, U)
  source: string;   // IEC/IS reference
  detail: string;   // Hover tooltip text
  tolerance?: string;
}

// Map SC Forces result keys to their trust levels
export const SC_FORCES_TRUST: Record<string, TrustBadge> = {};
// ── Stale Data System ──
export interface ModuleTimestamp {
  lastComputed: number;    // Date.now() when last calculated
  inputHash: string;       // Hash of key linked inputs
}

export function computeInputHash(values: Record<string, number | string>): string {
  return Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}

export function isStale(upstream: ModuleTimestamp, downstream: ModuleTimestamp): boolean {
  return upstream.lastComputed > downstream.lastComputed;
}
