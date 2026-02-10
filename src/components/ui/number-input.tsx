"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

export interface NumberInputProps {
    value: number | string;
    onChange: (value: number | string) => void;
    step?: number;
    min?: number;
    max?: number;
    className?: string;
    placeholder?: string;
}

export function NumberInput({ value, onChange, step = 1, min = 0, max, className, placeholder }: NumberInputProps) {
    const handleIncrement = () => {
        const numericValue = value === "" ? 0 : Number(value);
        if (isNaN(numericValue)) return;

        const newValue = Number((numericValue + step).toFixed(4));
        if (max !== undefined && newValue > max) return;
        onChange(newValue);
    };

    const handleDecrement = () => {
        const numericValue = value === "" ? 0 : Number(value);
        if (isNaN(numericValue)) return;

        const newValue = Number((numericValue - step).toFixed(4));
        if (newValue < min) return;
        onChange(newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty string to clear the input
        if (inputValue === "") {
            onChange("");
            return;
        }

        // Check if it's a valid number format (allows "1." "0.5" etc)
        if (/^-?\d*\.?\d*$/.test(inputValue)) {
            onChange(inputValue);
        }
    };

    return (
        <div className={`flex items-center bg-slate-800 rounded-md border border-slate-700 h-10 ${className}`}>
            <Button
                variant="ghost"
                size="icon"
                className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-l-md rounded-r-none border-r border-slate-700/50"
                onClick={handleDecrement}
            >
                <Minus className="h-3 w-3" />
            </Button>
            <Input
                type="text"
                inputMode="decimal"
                className="h-full border-0 bg-transparent text-center text-white focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-2"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
            />
            <Button
                variant="ghost"
                size="icon"
                className="h-full px-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-r-md rounded-l-none border-l border-slate-700/50"
                onClick={handleIncrement}
            >
                <Plus className="h-3 w-3" />
            </Button>
        </div>
    );
}
