"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";

export function TechnicalParameters() {
    const [params, setParams] = useState<{
        voltage: number | string;
        current: number | string;
        conductorSize: number | string;
        conductorType: string;
        distance: number | string;
        powerFactor: number | string;
        diversityFactor: number | string;
        resistance: number | string;
    }>({
        voltage: 33,
        current: 445,
        conductorSize: 100,
        conductorType: "Dog Conductor",
        distance: 38,
        powerFactor: 1,
        diversityFactor: 1.5,
        resistance: 0.2792
    });

    const updateParam = (key: string, value: number | string) => {
        setParams(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">TECHNICAL PARAMETERS</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Supply Voltage (KV)</Label>
                        <NumberInput
                            value={params.voltage}
                            onChange={(val) => updateParam('voltage', val)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Current (Amps)</Label>
                        <NumberInput
                            value={params.current}
                            onChange={(val) => updateParam('current', val)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Conductor Size (SQMM)</Label>
                        <NumberInput
                            value={params.conductorSize}
                            onChange={(val) => updateParam('conductorSize', val)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Conductor Type</Label>
                        <Input
                            className="bg-slate-800 border-slate-700 text-white h-10"
                            value={params.conductorType}
                            onChange={(e) => setParams(prev => ({ ...prev, conductorType: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Total Distance (KM)</Label>
                        <NumberInput
                            value={params.distance}
                            onChange={(val) => updateParam('distance', val)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Power Factor (cosØ)</Label>
                        <NumberInput
                            value={params.powerFactor}
                            onChange={(val) => updateParam('powerFactor', val)}
                            step={0.1}
                            max={1}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Diversity Factor</Label>
                        <NumberInput
                            value={params.diversityFactor}
                            onChange={(val) => updateParam('diversityFactor', val)}
                            step={0.1}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Resistance (Ω/KM)</Label>
                        <NumberInput
                            value={params.resistance}
                            onChange={(val) => updateParam('resistance', val)}
                            step={0.0001}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
