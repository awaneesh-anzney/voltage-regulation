import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { useCalculator } from "@/context/CalculatorContext";

export function LineSegments() {
    const { segments, setSegments } = useCalculator();

    const addSegment = () => {
        setSegments([...segments, { id: Date.now(), distance: 0, load: 0 }]);
    };

    const removeSegment = (id: number) => {
        setSegments(segments.filter((s) => s.id !== id));
    };

    const updateSegment = (id: number, field: 'distance' | 'load', value: number | string) => {
        setSegments(
            segments.map((s) =>
                s.id === id ? { ...s, [field]: value } : s
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
                            <NumberInput
                                value={segment.distance}
                                onChange={(val) => updateSegment(segment.id, 'distance', val)}
                                className="h-8 border-transparent focus-within:border-blue-500/50 bg-transparent"
                                placeholder="0"
                            />
                        </div>
                        <div className="col-span-5">
                            <NumberInput
                                value={segment.load}
                                onChange={(val) => updateSegment(segment.id, 'load', val)}
                                className="h-8 border-transparent focus-within:border-blue-500/50 bg-transparent"
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
