"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

export function ProjectDetails() {
    return (
        <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <CardTitle className="text-sm font-bold text-blue-500 tracking-wider">PROJECT DETAILS</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Project Name</Label>
                        <Input className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500" placeholder="LAVGAN SHIP REPAIR YARD..." />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Client Name</Label>
                        <Input className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500" placeholder="JAIGAD PORTS INFRASTRUCTURE..." />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Supply Point</Label>
                        <Input className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500" placeholder="Nivali Substation" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs text-gray-400 uppercase">Feeding Point</Label>
                        <Input className="bg-slate-800 border-slate-700 text-white placeholder:text-gray-500" placeholder="JSW" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
