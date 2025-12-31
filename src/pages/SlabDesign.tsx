import { useState } from "react";
import { Header } from "@/components/Header";
import { SlabInputForm } from "@/components/SlabInputForm";
import { SlabCalculationOutput } from "@/components/SlabCalculationOutput";
import { DesignAdvisory } from "@/components/DesignAdvisory";
import { calculateSlabDesign, type SlabInput, type SlabResult } from "@/lib/slabCalculations";
import { analyzeSlabDesign, type AdvisoryResult } from "@/lib/designAdvisory";

const SlabDesign = () => {
  const [result, setResult] = useState<SlabResult | null>(null);
  const [advisory, setAdvisory] = useState<AdvisoryResult | null>(null);

  const handleCalculate = (input: SlabInput) => {
    const calculationResult = calculateSlabDesign(input);
    setResult(calculationResult);
    
    // Generate design advisory
    const kValue = calculationResult.summary.shortSpanMoment * 1e6 / (1000 * Math.pow(calculationResult.summary.effectiveDepthShort, 2) * input.fcu);
    const advisoryResult = analyzeSlabDesign({
      kValue,
      kPrime: 0.156,
      shearStress: calculationResult.summary.shearStress || 0,
      permissibleShear: calculationResult.summary.permissibleShear || 0.5,
      actualSpanDepthRatio: (input.shortSpan * 1000) / calculationResult.summary.effectiveDepthShort,
      allowableSpanDepthRatio: 26 * 1.3, // Basic ratio × typical modification
      thickness: input.slabThickness,
      shortSpan: input.shortSpan,
      longSpan: input.longSpan,
      fcu: input.fcu,
      slabType: calculationResult.summary.slabType.includes('ONE-WAY') ? 'one-way' : 'two-way'
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
            RC Slab Design Calculator
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate step-by-step exam-style calculations for reinforced concrete slab design 
            following BS8110 code provisions. Supports one-way and two-way slabs.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <SlabInputForm onCalculate={handleCalculate} />
            
            {/* Quick Reference */}
            <div className="p-4 rounded-xl border border-border bg-card card-shadow">
              <h4 className="font-semibold text-sm mb-3 text-foreground">Quick Reference</h4>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>One-way if ly/lx &gt; 2</span>
                  <span className="text-primary font-medium">True</span>
                </div>
                <div className="flex justify-between">
                  <span>K&apos; (singly limit)</span>
                  <span className="text-primary font-medium">0.156</span>
                </div>
                <div className="flex justify-between">
                  <span>Min steel (0.13%bh)</span>
                  <span className="text-primary font-medium">BS8110</span>
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
            
            <SlabCalculationOutput result={result} />
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

export default SlabDesign;
