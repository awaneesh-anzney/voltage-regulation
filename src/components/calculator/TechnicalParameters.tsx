"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TechnicalParameters() {
    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">TECHNICAL PARAMETERS</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Supply Voltage (KV)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="33" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Current (Amps)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="445" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Conductor Size (SQMM)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="100" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Conductor Type</Label>
                        <Input className="bg-slate-800 border-slate-700 text-white" defaultValue="Dog Conductor" />
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Total Distance (KM)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="38" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Power Factor (cosØ)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="1" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Diversity Factor</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="1.5" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Resistance (Ω/KM)</Label>
                        <Input type="number" className="bg-slate-800 border-slate-700 text-white" defaultValue="0.2792" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
