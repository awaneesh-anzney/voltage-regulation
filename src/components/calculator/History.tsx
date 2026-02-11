"use client";

import { useHistory, useDeleteHistory } from "@/hooks/useHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, CheckCircle2, Trash2, XCircle } from "lucide-react";
import { DeleteConfirmation } from "./DeleteConfirmation";

export function CalculationHistory() {
    const { data, isLoading, isError } = useHistory();
    const { mutate: deleteHistory, isPending: isDeleting } = useDeleteHistory();
    const history = data?.projects || [];

    return (
        <Card className="bg-slate-900 border-slate-800 mt-6">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">CALCULATION HISTORY</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading ? (
                    <div className="text-center text-gray-500 py-4 text-sm">Loading history...</div>
                ) : isError ? (
                    <div className="text-center text-red-500 py-4 text-sm">Failed to load history</div>
                ) : history.length === 0 ? (
                    <div className="text-center text-gray-500 py-4 text-sm">No history available</div>
                ) : (
                    history.map((item) => (
                        <div key={item.id} className="relative bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center group hover:border-blue-500/30 transition-colors cursor-pointer pr-10">
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-blue-400 uppercase truncate max-w-[180px]">{item.project_name || "Unknown Project"}</div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                    {item.supply_voltage_kv} KV • {item.conductor_type} • {item.total_distance_km} KM
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {item.created_at ? new Date(item.created_at).toLocaleString() : "N/A"}
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-1.5 py-0.5 text-xs mb-1 block w-fit ml-auto">
                                    {item.voltage_regulation}%
                                </Badge>
                                <div className={`text-[10px] ${item.status === 'PASS' ? 'text-green-500' : 'text-red-500'} flex items-center justify-end gap-1`}>
                                    {item.status === 'PASS' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {item.status}
                                </div>
                            </div>

                            <DeleteConfirmation
                                onConfirm={() => deleteHistory(item.id)}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        disabled={isDeleting}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                }
                            />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
