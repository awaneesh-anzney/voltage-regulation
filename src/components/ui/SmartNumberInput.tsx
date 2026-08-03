"use client";

import { useState } from "react";

interface SmartNumberInputProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  fallback?: number;
}

/**
 * A number input that allows the field to be fully cleared while typing,
 * avoiding the "0-prefix" bug (e.g. 0154 instead of 154).
 * Reverts to the last valid value (or a fallback) on blur if left empty.
 */
export function SmartNumberInput({
  value,
  onChange,
  step,
  min,
  max,
  disabled,
  className,
  fallback,
}: SmartNumberInputProps) {
  const [localValue, setLocalValue] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when not focused
  if (!isFocused && localValue !== String(value)) {
    setLocalValue(String(value));
  }

  const defaultClass =
    "w-full bg-[#0a0f18] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all";

  return (
    <input
      type="number"
      value={isFocused ? localValue : value}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onFocus={() => {
        setIsFocused(true);
        setLocalValue(String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setLocalValue(raw);
        const parsed = parseFloat(raw);
        if (!isNaN(parsed)) {
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setIsFocused(false);
        const parsed = parseFloat(localValue);
        if (isNaN(parsed)) {
          const revert = fallback ?? value;
          setLocalValue(String(revert));
          onChange(revert);
        } else {
          onChange(parsed);
          setLocalValue(String(parsed));
        }
      }}
      className={className ?? defaultClass}
    />
  );
}
