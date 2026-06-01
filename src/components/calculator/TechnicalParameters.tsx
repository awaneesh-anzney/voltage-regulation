"use client";

import { useCalculator } from "@/context/CalculatorContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { STANDARD_VOLTAGES, CONDUCTOR_DATABASE } from "@/lib/constants";
import { AlertTriangle, Info, RefreshCw, Layers } from "lucide-react";

export function TechnicalParameters() {
    const { technicalParams, setTechnicalParams } = useCalculator();

    // Check if initial values match any standard options
    const isInitialVoltageStandard = STANDARD_VOLTAGES.includes(Number(technicalParams.voltage));
    const [isCustomVoltage, setIsCustomVoltage] = useState(
        !isInitialVoltageStandard && technicalParams.voltage !== ""
    );

    const isInitialConductorStandard = Object.keys(CONDUCTOR_DATABASE).includes(technicalParams.conductorType);
    const [isCustomConductor, setIsCustomConductor] = useState(
        !isInitialConductorStandard && technicalParams.conductorType !== "" && technicalParams.conductorType !== "Custom"
    );

    // Sync state when external changes occur (like loading history item)
    useEffect(() => {
        const isVStandard = STANDARD_VOLTAGES.includes(Number(technicalParams.voltage));
        setIsCustomVoltage(!isVStandard && technicalParams.voltage !== "");

        const isCStandard = Object.keys(CONDUCTOR_DATABASE).includes(technicalParams.conductorType);
        setIsCustomConductor(!isCStandard && technicalParams.conductorType !== "" && technicalParams.conductorType !== "Custom");
    }, [technicalParams.voltage, technicalParams.conductorType]);

    const updateParam = (key: string, value: number | string | boolean) => {
        setTechnicalParams(prev => {
            const next = { ...prev, [key]: value };

            // Manual override detection: If editing resistance, reactance, or size manually, switch Conductor Type to "Custom"
            if (key === 'resistance' || key === 'conductorSize' || key === 'reactance') {
                const dbConductor = CONDUCTOR_DATABASE[prev.conductorType];
                if (dbConductor) {
                    const differs = 
                        (key === 'resistance' && Number(value) !== dbConductor.resistance) ||
                        (key === 'conductorSize' && Number(value) !== dbConductor.sizeSqmm) ||
                        (key === 'reactance' && Number(value) !== dbConductor.reactance);

                    if (differs) {
                        next.conductorType = "Custom";
                        setIsCustomConductor(true);
                    }
                }
            }

            return next;
        });
    };

    const handleVoltageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "custom") {
            setIsCustomVoltage(true);
            updateParam('voltage', "");
        } else {
            setIsCustomVoltage(false);
            updateParam('voltage', Number(val));
        }
    };

    const handleConductorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val === "custom") {
            setIsCustomConductor(true);
            updateParam('conductorType', "Custom");
            updateParam('conductorSize', "");
            updateParam('resistance', "");
            updateParam('reactance', 0.0);
        } else {
            setIsCustomConductor(false);
            const cond = CONDUCTOR_DATABASE[val];
            if (cond) {
                setTechnicalParams(prev => ({
                    ...prev,
                    conductorType: val,
                    conductorSize: cond.sizeSqmm,
                    resistance: cond.resistance,
                    reactance: cond.reactance,
                }));
            }
        }
    };

    // CEA Compatibility Check Logic
    const getPlanningAlert = () => {
        const v = Number(technicalParams.voltage);
        const condName = technicalParams.conductorType;
        if (!v || !condName || condName === "Custom") return null;

        const cond = CONDUCTOR_DATABASE[condName];
        if (!cond) return null;

        if (v > cond.maxVoltageKv) {
            return {
                type: "warning",
                title: "CEA Planning Advisory: Voltage Mismatch",
                message: `${condName} conductor is standardly rated for up to ${cond.maxVoltageKv} kV. At ${v} kV, it is highly susceptible to excessive corona loss, electromagnetic interference, and thermal overloading under contingency (N-1) conditions. Consider upgrading to a larger conductor like ${v >= 220 ? "Zebra or Moose" : "Panther"}.`
            };
        }

        if (v <= 33 && (condName === "Zebra" || condName === "Moose")) {
            return {
                type: "info",
                title: "Economic Advisory: Oversized Conductor",
                message: `${condName} conductor is an extra-high voltage (EHV) conductor designed for heavy power transmission (220kV+). For a ${v} kV system, using ${condName} is highly uneconomical due to material costs and structural support weight. Standard planning suggests Rabbit or Dog conductors.`
            };
        }

        return null;
    };

    const activeConductor = CONDUCTOR_DATABASE[technicalParams.conductorType];
    const alert = getPlanningAlert();

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-sm font-bold text-blue-500 tracking-wider uppercase">TECHNICAL PARAMETERS</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Layers className="h-3.5 w-3.5" /> CEA Standard Integrated
                </div>
            </CardHeader>
            <CardContent className="grid gap-5">
                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Voltage Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase flex justify-between items-center h-4">
                            <span>Supply Voltage (KV)</span>
                            {isCustomVoltage && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomVoltage(false);
                                        updateParam('voltage', 220);
                                    }}
                                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1 text-[10px] uppercase font-bold"
                                >
                                    <RefreshCw className="h-2.5 w-2.5" /> Std
                                </button>
                            )}
                        </Label>
                        {isCustomVoltage ? (
                            <NumberInput
                                value={technicalParams.voltage}
                                onChange={(val) => updateParam('voltage', val)}
                                placeholder="Enter custom KV"
                            />
                        ) : (
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={technicalParams.voltage}
                                onChange={handleVoltageChange}
                            >
                                <option value="" disabled>Select Voltage</option>
                                {STANDARD_VOLTAGES.map(v => (
                                    <option key={v} value={v}>{v} KV</option>
                                ))}
                                <option value="custom">Custom (Specify...)</option>
                            </select>
                        )}
                    </div>

                    {/* Current */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase flex items-center h-4">Current (Amps)</Label>
                        <NumberInput
                            value={technicalParams.current}
                            onChange={(val) => updateParam('current', val)}
                        />
                    </div>

                    {/* Conductor Size */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase flex items-center h-4">Conductor Size (SQMM)</Label>
                        <NumberInput
                            value={technicalParams.conductorSize}
                            onChange={(val) => updateParam('conductorSize', val)}
                        />
                    </div>

                    {/* Conductor Type Selector */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase flex justify-between items-center h-4">
                            <span>Conductor Type</span>
                            {isCustomConductor && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCustomConductor(false);
                                        const def = "Zebra";
                                        const cond = CONDUCTOR_DATABASE[def];
                                        setTechnicalParams(prev => ({
                                            ...prev,
                                            conductorType: def,
                                            conductorSize: cond.sizeSqmm,
                                            resistance: cond.resistance,
                                            reactance: cond.reactance,
                                        }));
                                    }}
                                    className="text-blue-500 hover:text-blue-400 flex items-center gap-1 text-[10px] uppercase font-bold"
                                >
                                    <RefreshCw className="h-2.5 w-2.5" /> Std
                                </button>
                            )}
                        </Label>
                        {isCustomConductor ? (
                            <Input
                                className="bg-slate-800 border-slate-700 text-white h-10 px-3 text-sm focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
                                value={technicalParams.conductorType}
                                onChange={(e) => updateParam('conductorType', e.target.value)}
                                placeholder="Enter custom name"
                            />
                        ) : (
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-md h-10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={technicalParams.conductorType}
                                onChange={handleConductorChange}
                            >
                                <option value="" disabled>Select Conductor</option>
                                {Object.keys(CONDUCTOR_DATABASE).map(name => (
                                    <option key={name} value={name}>ACSR {name}</option>
                                ))}
                                <option value="custom">Custom (Specify...)</option>
                            </select>
                        )}
                    </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Distance */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Total Distance (KM)</Label>
                        <NumberInput
                            value={technicalParams.distance}
                            onChange={(val) => updateParam('distance', val)}
                        />
                    </div>

                    {/* Power Factor */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Power Factor (cosØ)</Label>
                        <NumberInput
                            value={technicalParams.powerFactor}
                            onChange={(val) => updateParam('powerFactor', val)}
                            step={0.01}
                            max={1}
                        />
                    </div>

                    {/* Diversity Factor */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Diversity Factor</Label>
                        <NumberInput
                            value={technicalParams.diversityFactor}
                            onChange={(val) => updateParam('diversityFactor', val)}
                            step={0.1}
                        />
                    </div>

                    {/* Resistance */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Resistance (Ω/KM)</Label>
                        <NumberInput
                            value={technicalParams.resistance}
                            onChange={(val) => updateParam('resistance', val)}
                            step={0.0001}
                        />
                    </div>
                </div>

                {/* Row 3 - Reactance & Acceptable Limit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                    {/* Consider Reactance Checkbox */}
                    <div className="flex items-center space-x-3 bg-slate-800/40 border border-slate-700/50 rounded-md h-10 px-3 self-end">
                        <Checkbox
                            id="considerReactance"
                            className="border-2 border-slate-500 bg-slate-900/80 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 size-5 cursor-pointer transition-colors"
                            checked={technicalParams.considerReactance}
                            onCheckedChange={(checked: boolean | "indeterminate") => updateParam('considerReactance', checked === true)}
                        />
                        <Label htmlFor="considerReactance" className="text-xs text-gray-300 font-semibold cursor-pointer uppercase select-none">
                            Consider Reactance
                        </Label>
                    </div>

                    {/* Reactance */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Reactance (Ω/KM)</Label>
                        <NumberInput
                            value={technicalParams.reactance}
                            onChange={(val) => updateParam('reactance', val)}
                            step={0.0001}
                            className={!technicalParams.considerReactance ? "opacity-30 cursor-not-allowed pointer-events-none" : ""}
                        />
                    </div>

                    {/* Acceptable Limit */}
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Acceptable Limit (%)</Label>
                        <NumberInput
                            value={technicalParams.acceptableLimit}
                            onChange={(val) => updateParam('acceptableLimit', val)}
                            step={0.5}
                        />
                    </div>
                </div>

                {/* Conductor Spec Sheet Details */}
                {activeConductor && (
                    <div className="mt-2 p-4 rounded-lg bg-slate-950/40 border border-slate-800/60 backdrop-blur-xs transition-all duration-300">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <span className="text-[10px] font-bold text-blue-500 tracking-wider uppercase block mb-0.5">ACSR Conductor Profile</span>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                    ACSR {activeConductor.name}
                                    <span className="text-[9px] font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Standard Specs
                                    </span>
                                </h4>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6 flex-1 max-w-xl md:ml-6">
                                <div>
                                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Stranding</span>
                                    <span className="text-xs font-semibold text-slate-300">{activeConductor.stranding}</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Nominal Weight</span>
                                    <span className="text-xs font-semibold text-slate-300">{activeConductor.weight}</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">AC Resistance</span>
                                    <span className="text-xs font-semibold text-slate-300">{activeConductor.resistance} Ω/KM</span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Reactance (50Hz)</span>
                                    <span className="text-xs font-semibold text-slate-300">{activeConductor.reactance} Ω/KM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Compatibility alerts */}
                {alert && (
                    <div className={`flex gap-3 p-3.5 rounded-lg border text-xs leading-relaxed transition-all duration-300 ${
                        alert.type === "warning"
                            ? "bg-amber-950/20 border-amber-900/40 text-amber-300"
                            : "bg-blue-950/20 border-blue-900/40 text-blue-300"
                    }`}>
                        <div className="shrink-0 mt-0.5">
                            <AlertTriangle className={`h-4.5 w-4.5 ${alert.type === "warning" ? "text-amber-400" : "text-blue-400"}`} />
                        </div>
                        <div className="space-y-1">
                            <h5 className="font-bold uppercase tracking-wider text-[10px]">{alert.title}</h5>
                            <p className="opacity-90">{alert.message}</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
