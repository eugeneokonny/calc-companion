import { useState } from "react";
import { Header } from "@/components/Header";
import { ContinuousBeamInputForm } from "@/components/ContinuousBeamInputForm";
import { ContinuousBeamOutput } from "@/components/ContinuousBeamOutput";
import { calculateContinuousBeamDesign, type ContinuousBeamInput, type ContinuousBeamResult } from "@/lib/continuousBeamCalculations";

const ContinuousBeamDesign = () => {
  const [result, setResult] = useState<ContinuousBeamResult | null>(null);

  const handleCalculate = (input: ContinuousBeamInput) => {
    const calculationResult = calculateContinuousBeamDesign(input);
    setResult(calculationResult);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            Continuous Beam Design
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Analyze multi-span continuous beams with automatic moment and shear distribution 
            following BS8110 Table 3.5 coefficients.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ContinuousBeamInputForm onCalculate={handleCalculate} />
            
            {/* Quick Reference */}
            <div className="mt-6 p-4 rounded-lg border border-border/50 bg-muted/20">
              <h4 className="font-semibold text-sm mb-3 text-muted-foreground">BS8110 Table 3.5 Reference</h4>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>2-span interior support</span>
                  <span className="text-primary">-0.125</span>
                </div>
                <div className="flex justify-between">
                  <span>3-span interior support</span>
                  <span className="text-primary">-0.100</span>
                </div>
                <div className="flex justify-between">
                  <span>Mid-span (exterior)</span>
                  <span className="text-primary">+0.080</span>
                </div>
                <div className="flex justify-between">
                  <span>Mid-span (interior)</span>
                  <span className="text-primary">+0.025</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <ContinuousBeamOutput result={result} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>
            Calculations based on BS8110-1:1997 • For educational purposes only • 
            Always verify with qualified engineer
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ContinuousBeamDesign;
