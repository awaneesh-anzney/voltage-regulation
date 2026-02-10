"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle2 } from "lucide-react";

export function CalculationHistory() {
    return (
        <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">CALCULATION HISTORY</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center group hover:border-blue-500/30 transition-colors cursor-pointer">
                    <div className="space-y-1">
                        <div className="text-xs font-bold text-blue-400 uppercase truncate max-w-[180px]">LAVGAN SHIP REPAIR YARD...</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                            33 KV • Dog Conductor • 38 KM
                        </div>
                        <div className="text-[10px] text-gray-500">
                            10 Feb 2026, 11:17
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-1.5 py-0.5 text-xs mb-1 block w-fit ml-auto">
                            3.12%
                        </Badge>
                        <div className="text-[10px] text-green-500 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pass
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center group hover:border-blue-500/30 transition-colors cursor-pointer">
                    <div className="space-y-1">
                        <div className="text-xs font-bold text-blue-400 uppercase truncate max-w-[180px]">LAVGAN SHIP REPAIR YARD...</div>
                        <div className="text-[10px] text-gray-400 font-mono">
                            33 KV • Dog Conductor • 38 KM
                        </div>
                        <div className="text-[10px] text-gray-500">
                            10 Feb 2026, 11:13
                        </div>
                    </div>
                    <div className="text-right">
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-1.5 py-0.5 text-xs mb-1 block w-fit ml-auto">
                            0.01%
                        </Badge>
                        <div className="text-[10px] text-green-500 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pass
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
