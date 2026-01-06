import { useState } from "react";
import { Header } from "@/components/Header";
import { StaircaseInputForm } from "@/components/StaircaseInputForm";
import { StaircaseOutput } from "@/components/StaircaseOutput";
import { SaveCalculationButton } from "@/components/SaveCalculationButton";
import { calculateStaircaseDesign, type StaircaseInput, type StaircaseResult } from "@/lib/staircaseCalculations";

export default function StaircaseDesign() {
  const [result, setResult] = useState<StaircaseResult | null>(null);
  const [lastInput, setLastInput] = useState<StaircaseInput | null>(null);

  const handleCalculate = (input: StaircaseInput) => {
    const calculationResult = calculateStaircaseDesign(input);
    setResult(calculationResult);
    setLastInput(input);
  };

  const getDefaultTitle = () => {
    if (!lastInput) return "";
    return `${lastInput.staircaseId} - ${lastInput.spanLength}m span h=${lastInput.waistThickness}mm`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Staircase Slab Design</h1>
          <p className="text-muted-foreground">
            BS 8110-1:1997 compliant design for reinforced concrete staircase slabs
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <StaircaseInputForm onCalculate={handleCalculate} />
          </div>
          
          <div className="space-y-4">
            {result && lastInput && (
              <div className="flex justify-end">
                <SaveCalculationButton
                  calculationType="staircase"
                  inputData={lastInput as unknown as Record<string, unknown>}
                  resultData={result as unknown as Record<string, unknown>}
                  defaultTitle={getDefaultTitle()}
                />
              </div>
            )}
            <StaircaseOutput result={result} />
          </div>
        </div>
      </main>
    </div>
  );
}
