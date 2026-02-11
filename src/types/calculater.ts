export interface Segment {
    length: number;
    power: number;
}

export interface CalculationRequest {
    project_name?: string;
    client_name?: string;
    supply_point?: string;
    feeding_point?: string;
    supply_voltage_kv: number;
    current_amps: number;
    conductor_size: string;
    conductor_type: string;
    total_distance_km: number;
    power_factor: number;
    diversity_factor: number;
    resistance: number;
    acceptable_limit: number;
    reactance?: number;
    consider_reactance?: boolean;
    segments: Segment[];
}

export interface CalculationResponse {
    voltage_regulation: number;
    status: string;
    acceptable: boolean;
    numerator_value: number;
    numerator_label: string;
    denominator_value: number;
    denominator_label: string;
    message: string;
    formula_used: {
        formula: string;
        substitution: string;
        result_expression: string;
    };
    notes: string[];
    inputs: CalculationRequest;
    saved: boolean;
    calculation_id: number;
}

export interface Project {
    id: number;
    project_name: string;
    client_name: string;
    location: string | null;
    supply_point: string;
    feeding_point: string;
    supply_voltage_kv: number;
    load_mva: number;
    current_amps: number;
    conductor_size: string;
    conductor_type: string;
    total_distance_km: number;
    power_factor: number;
    diversity_factor: number;
    resistance: number;
    reactance: number;
    consider_reactance: boolean;
    acceptable_limit: number;
    segments: Segment[];
    voltage_regulation: number;
    status: string;
    date: string;
    created_at: string;
    updated_at: string | null;
}

export interface ProjectsResponse {
    total: number;
    projects: Project[];
}
