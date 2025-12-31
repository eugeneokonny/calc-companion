import { useState } from "react";
import { Header } from "@/components/Header";
import { BeamInputForm } from "@/components/BeamInputForm";
import { CalculationOutput } from "@/components/CalculationOutput";
import { DesignAdvisory } from "@/components/DesignAdvisory";
import { calculateBeamDesign, type BeamInput, type BeamResult } from "@/lib/beamCalculations";
import { analyzeBeamDesign, type AdvisoryResult } from "@/lib/designAdvisory";

const Index = () => {
  const [result, setResult] = useState<BeamResult | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResult | null>(null);

  const handleCalculate = (input: BeamInput) => {
    const calculationResult = calculateBeamDesign(input);
    setResult(calculationResult);
    
    // Generate design advisory
    const advisoryResult = analyzeBeamDesign({
      kValue: calculationResult.summary.kValue,
      kPrime: 0.156,
      shearStress: calculationResult.summary.shearStress,
      maxShearStress: Math.min(0.8 * Math.sqrt(input.fcu), 5),
      actualSpanDepthRatio: (input.span * 1000) / input.effectiveDepth,
      allowableSpanDepthRatio: 20 * 1.3, // Basic ratio × typical modification
      tensionSteel: calculationResult.summary.tensionSteel,
      width: input.width,
      depth: input.effectiveDepth + input.cover + 10,
      effectiveDepth: input.effectiveDepth,
      span: input.span,
      fcu: input.fcu,
      fy: input.fy
    });
    setAdvisory(advisoryResult);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-foreground">
            RC Beam Design Calculator
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate step-by-step exam-style calculations for reinforced concrete beam design 
            following BS8110 code provisions.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <BeamInputForm onCalculate={handleCalculate} />
            
            {/* Quick Reference */}
            <div className="p-4 rounded-xl border border-border bg-card card-shadow">
              <h4 className="font-semibold text-sm mb-3 text-foreground">Quick Reference</h4>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>K&apos; (singly limit)</span>
                  <span className="text-primary font-medium">0.156</span>
                </div>
                <div className="flex justify-between">
                  <span>γc (concrete)</span>
                  <span className="text-primary font-medium">1.50</span>
                </div>
                <div className="flex justify-between">
                  <span>γs (steel)</span>
                  <span className="text-primary font-medium">1.15</span>
                </div>
                <div className="flex justify-between">
                  <span>γf,dead</span>
                  <span className="text-primary font-medium">1.40</span>
                </div>
                <div className="flex justify-between">
                  <span>γf,live</span>
                  <span className="text-primary font-medium">1.60</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Design Advisory */}
            {advisory && (
              <div className="animate-fade-in">
                <DesignAdvisory 
                  status={advisory.overallStatus} 
                  failures={advisory.failures} 
                  advice={advisory.advice} 
                />
              </div>
            )}
            
            <CalculationOutput result={result} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>
            Calculations based on BS8110-1:1997 • For educational purposes only • 
            Always verify with qualified engineer
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
