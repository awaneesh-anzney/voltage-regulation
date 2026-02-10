import { Zap } from "lucide-react";

export function Header() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-blue-500/10 rounded-lg">
        <Zap className="w-6 h-6 text-blue-500" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">ACSR Conductor Voltage Regulation</h1>
        <p className="text-sm text-gray-400">Transmission Line Calculator</p>
      </div>
    </div>
  );
}
