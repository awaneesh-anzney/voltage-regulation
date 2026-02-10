"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function LineSegments() {
    const [segments, setSegments] = useState([
        { id: 1, distance: 19, load: 20.43 },
        { id: 2, distance: 11, load: 12.28 },
        { id: 3, distance: 8, load: 7.28 },
        { id: 4, distance: 0, load: 0 },
        { id: 5, distance: 0, load: 0 },
    ]);

    const addSegment = () => {
        setSegments([...segments, { id: Date.now(), distance: 0, load: 0 }]);
    };

    const removeSegment = (id: number) => {
        setSegments(segments.filter((s) => s.id !== id));
    };

    const updateSegment = (id: number, field: 'distance' | 'load', value: string) => {
        setSegments(
            segments.map((s) =>
                s.id === id ? { ...s, [field]: parseFloat(value) || 0 } : s
            )
        );
    };

    return (
        <Card className="bg-slate-900 border-slate-800 mb-6">
            <div className="flex items-center justify-between p-6 pb-2">
                <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">LINE SEGMENTS</CardTitle>
                <Button variant="outline" size="sm" onClick={addSegment} className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 h-8 text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add Segment
                </Button>
            </div>
            <CardContent className="grid gap-3">
                <div className="grid grid-cols-12 gap-4 px-2 text-xs text-gray-400 uppercase font-medium">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Distance (KM)</div>
                    <div className="col-span-5">Load (MVA)</div>
                    <div className="col-span-1"></div>
                </div>

                {segments.map((segment, index) => (
                    <div key={segment.id} className="grid grid-cols-12 gap-4 items-center bg-slate-800/50 p-2 rounded-md border border-slate-800/50 hover:border-slate-700 transition-colors">
                        <div className="col-span-1 text-center text-gray-500 text-xs font-mono">#{index + 1}</div>
                        <div className="col-span-5">
                            <Input
                                type="number"
                                value={segment.distance}
                                onChange={(e) => updateSegment(segment.id, 'distance', e.target.value)}
                                className="bg-transparent border-0 border-b border-transparent focus-visible:border-blue-500 rounded-none px-0 h-8 text-white placeholder:text-gray-600 focus-visible:ring-0"
                                placeholder="0"
                            />
                        </div>
                        <div className="col-span-5">
                            <Input
                                type="number"
                                value={segment.load}
                                onChange={(e) => updateSegment(segment.id, 'load', e.target.value)}
                                className="bg-transparent border-0 border-b border-transparent focus-visible:border-blue-500 rounded-none px-0 h-8 text-white placeholder:text-gray-600 focus-visible:ring-0"
                                placeholder="0"
                            />
                        </div>
                        <div className="col-span-1 flex justify-center">
                            <Button variant="ghost" size="icon" onClick={() => removeSegment(segment.id)} className="h-6 w-6 text-gray-500 hover:text-red-400 hover:bg-red-900/20">
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
