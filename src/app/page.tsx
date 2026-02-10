import { Header } from "@/components/calculator/Header";
import { ProjectDetails } from "@/components/calculator/ProjectDetails";
import { TechnicalParameters } from "@/components/calculator/TechnicalParameters";
import { LineSegments } from "@/components/calculator/LineSegments";
import { CalculatorResults } from "@/components/calculator/Results";
import { CalculationHistory } from "@/components/calculator/History";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      <div className="max-w-[1400px] mx-auto">
        <Header />

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <ProjectDetails />
            <TechnicalParameters />
            <LineSegments />

            <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-6 text-sm tracking-wide">
              <Zap className="mr-2 h-4 w-4 fill-current" />
              CALCULATE VOLTAGE REGULATION
            </Button>
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-6">
            <CalculatorResults />
            <CalculationHistory />
          </div>
        </div>
      </div>
    </div>
  );
}
