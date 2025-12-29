import { useState } from "react";
import { Header } from "@/components/Header";
import { SlabInputForm } from "@/components/SlabInputForm";
import { SlabCalculationOutput } from "@/components/SlabCalculationOutput";
import { calculateSlabDesign, type SlabInput, type SlabResult } from "@/lib/slabCalculations";

const SlabDesign = () => {
  const [result, setResult] = useState<SlabResult | null>(null);

  const handleCalculate = (input: SlabInput) => {
    const calculationResult = calculateSlabDesign(input);
    setResult(calculationResult);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            RC Slab Design Calculator
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate step-by-step exam-style calculations for reinforced concrete slab design 
            following BS8110 code provisions. Supports one-way and two-way slabs.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-[400px_1fr] gap-6">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SlabInputForm onCalculate={handleCalculate} />
            
            {/* Quick Reference */}
            <div className="mt-6 p-4 rounded-lg border border-border/50 bg-muted/20">
              <h4 className="font-semibold text-sm mb-3 text-muted-foreground">Quick Reference</h4>
              <div className="space-y-2 text-xs font-mono text-muted-foreground">
                <div className="flex justify-between">
                  <span>One-way if ly/lx &gt; 2</span>
                  <span className="text-primary">True</span>
                </div>
                <div className="flex justify-between">
                  <span>K&apos; (singly limit)</span>
                  <span className="text-primary">0.156</span>
                </div>
                <div className="flex justify-between">
                  <span>Min steel (0.13%bh)</span>
                  <span className="text-primary">BS8110</span>
                </div>
                <div className="flex justify-between">
                  <span>γf,dead</span>
                  <span className="text-primary">1.40</span>
                </div>
                <div className="flex justify-between">
                  <span>γf,live</span>
                  <span className="text-primary">1.60</span>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <SlabCalculationOutput result={result} />
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

export default SlabDesign;
