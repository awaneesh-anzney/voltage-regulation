"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CalculationResponse } from '@/types/calculater';

interface ProjectDetails {
    projectName: string;
    clientName: string;
    supplyPoint: string;
    feedingPoint: string;
}

interface TechnicalParams {
    voltage: number | string;
    current: number | string;
    conductorSize: number | string;
    conductorType: string;
    distance: number | string;
    powerFactor: number | string;
    diversityFactor: number | string;
    resistance: number | string;
    acceptableLimit: number | string;
    reactance: number | string;
    considerReactance: boolean;
}

interface Segment {
    id: number;
    distance: number | string;
    load: number | string;
}

interface HistoryItem {
    id: number;
    title: string;
    details: string;
    date: string;
    percentage: string;
    status: "Pass" | "Fail";
}

interface CalculatorContextType {
    projectDetails: ProjectDetails;
    setProjectDetails: React.Dispatch<React.SetStateAction<ProjectDetails>>;
    technicalParams: TechnicalParams;
    setTechnicalParams: React.Dispatch<React.SetStateAction<TechnicalParams>>;
    segments: Segment[];
    setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
    calculationResult: CalculationResponse | null;
    setCalculationResult: (result: CalculationResponse | null) => void;
    history: HistoryItem[];
    addToHistory: (item: HistoryItem) => void;
    clearHistory: (id?: number) => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider = ({ children }: { children: ReactNode }) => {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails>({
        projectName: '',
        clientName: '',
        supplyPoint: '',
        feedingPoint: '',
    });

    const [technicalParams, setTechnicalParams] = useState<TechnicalParams>({
        voltage: '',
        current: '',
        conductorSize: '',
        conductorType: '',
        distance: '',
        powerFactor: '',
        diversityFactor: '',
        resistance: '',
        acceptableLimit: 12.0,
        reactance: 0.0,
        considerReactance: false,
    });

    const [segments, setSegments] = useState<Segment[]>([
        { id: 1, distance: '', load: '' },
    ]);

    const [calculationResult, setCalculationResult] = useState<CalculationResponse | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    const addToHistory = (item: HistoryItem) => {
        setHistory(prev => [item, ...prev]);
    };

    const clearHistory = (id?: number) => {
        if (id) {
            setHistory(prev => prev.filter(item => item.id !== id));
        } else {
            setHistory([]);
        }
    };

    return (
        <CalculatorContext.Provider value={{
            projectDetails,
            setProjectDetails,
            technicalParams,
            setTechnicalParams,
            segments,
            setSegments,
            calculationResult,
            setCalculationResult,
            history,
            addToHistory,
            clearHistory
        }}>
            {children}
        </CalculatorContext.Provider>
    );
};

export const useCalculator = () => {
    const context = useContext(CalculatorContext);
    if (!context) {
        throw new Error('useCalculator must be used within a CalculatorProvider');
    }
    return context;
};
