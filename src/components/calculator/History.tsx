"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, Trash2 } from "lucide-react";

interface HistoryItem {
    id: number;
    title: string;
    details: string;
    date: string;
    percentage: string;
    status: "Pass" | "Fail";
}

export function CalculationHistory() {
    const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
        {
            id: 1,
            title: "LAVGAN SHIP REPAIR YARD...",
            details: "33 KV • Dog Conductor • 38 KM",
            date: "10 Feb 2026, 11:17",
            percentage: "3.12%",
            status: "Pass"
        },
        {
            id: 2,
            title: "LAVGAN SHIP REPAIR YARD...",
            details: "33 KV • Dog Conductor • 38 KM",
            date: "10 Feb 2026, 11:13",
            percentage: "0.01%",
            status: "Pass"
        }
    ]);

    const deleteItem = (id: number) => {
        setHistoryItems(prev => prev.filter(item => item.id !== id));
    };

    return (
        <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">CALCULATION HISTORY</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {historyItems.length === 0 ? (
                    <div className="text-center text-gray-500 py-4 text-sm">No history available</div>
                ) : (
                    historyItems.map((item) => (
                        <div key={item.id} className="relative bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center group hover:border-blue-500/30 transition-colors cursor-pointer pr-10">
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-blue-400 uppercase truncate max-w-[180px]">{item.title}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                    {item.details}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {item.date}
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-1.5 py-0.5 text-xs mb-1 block w-fit ml-auto">
                                    {item.percentage}
                                </Badge>
                                <div className="text-[10px] text-green-500 flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> {item.status}
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteItem(item.id);
                                }}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
