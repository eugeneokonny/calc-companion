import React, { useState } from 'react';
import { Header } from '@/components/Header';
import ColumnInputForm from '@/components/ColumnInputForm';
import ColumnOutput from '@/components/ColumnOutput';
import { SaveCalculationButton } from '@/components/SaveCalculationButton';
import { ColumnInputs, ColumnResult, calculateColumnDesign } from '@/lib/columnCalculations';

const ColumnDesign: React.FC = () => {
  const [result, setResult] = useState<ColumnResult | null>(null);
  const [currentInputs, setCurrentInputs] = useState<ColumnInputs | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = (inputs: ColumnInputs) => {
    setIsCalculating(true);
    setCurrentInputs(inputs);
    
    // Small delay for UX feedback
    setTimeout(() => {
      const calculationResult = calculateColumnDesign(inputs);
      setResult(calculationResult);
      setIsCalculating(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">RC Column Design</h1>
          <p className="text-muted-foreground">
            Design reinforced concrete columns to BS 8110-1:1997 with comprehensive step-by-step calculations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <ColumnInputForm onCalculate={handleCalculate} isCalculating={isCalculating} />
            
            {result && currentInputs && (
              <SaveCalculationButton
                calculationType="column"
                inputData={currentInputs as unknown as Record<string, unknown>}
                resultData={result as unknown as Record<string, unknown>}
              />
            )}
          </div>
          
          <div>
            <ColumnOutput result={result} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ColumnDesign;
