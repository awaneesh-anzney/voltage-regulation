"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, CheckCircle2, Printer } from "lucide-react";

export function CalculatorResults() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Card className="bg-slate-900 border-slate-800 h-fit">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">CALCULATION RESULTS</CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                        onClick={handlePrint}
                        title="Print Results"
                    >
                        <Printer className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-gray-400 uppercase font-medium">% VOLTAGE REGULATION (VR)</span>
                        <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0 px-2 py-0.5 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> PASS
                        </Badge>
                    </div>
                    <div className="text-4xl font-bold text-white">
                        3.12<span className="text-xl text-gray-500 ml-1">%</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/30 p-3 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase mb-1">NUMERATOR (Σ L×P)</div>
                        <div className="text-xl font-bold text-white">581.49</div>
                    </div>
                    <div className="bg-slate-800/30 p-3 rounded-lg">
                        <div className="text-xs text-gray-500 uppercase mb-1">DENOMINATOR (I×R×COSØ×DF)</div>
                        <div className="text-xl font-bold text-white">186.37</div>
                    </div>
                </div>

                <div className="bg-slate-800/30 p-4 rounded-lg space-y-3">
                    <div className="text-xs text-gray-400 uppercase font-medium">FORMULA USED</div>
                    <div className="font-mono text-xs text-blue-300 leading-relaxed">
                        Vr = Σ(Length × Power) / (I × R × CosØ × Diversity Factor)
                    </div>
                    <div className="font-mono text-xs text-gray-400 leading-relaxed border-t border-slate-700/50 pt-2">
                        = (19x20.43 + 11x12.28 + 8x7.28 + 0x0 + 0x0) / (445 × 0.2792 × 1 × 1.5)
                    </div>
                    <div className="font-mono text-xs text-blue-400 font-bold">
                        = 581.49 / 186.37 = 3.12%
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex gap-2 text-xs text-gray-400">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Voltage regulation should be less than 12%</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Deration factor considered for Transmission Line & Conductor</span>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400">
                        <Info className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>Reactance not considered (negligible in transmission line)</span>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
