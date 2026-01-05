import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, RotateCcw, Grid3X3, AlertCircle, CheckCircle2 } from "lucide-react";
import type { SlabInput, SlabType, EdgeContinuity, SupportType } from "@/lib/slabCalculations";

interface SlabInputFormProps {
  onCalculate: (input: SlabInput) => void;
}

const defaultValues: SlabInput = {
  slabId: 'S1',
  slabType: 'two-way',
  panelType: 'interior',
  shortEdgeContinuity: 'continuous',
  longEdgeContinuity: 'continuous',
  edgeRestraint: {
    e1_short: 'continuous',
    e2_short: 'continuous',
    e3_long: 'continuous',
    e4_long: 'continuous',
  },
  supportTypes: {
    e1: 'beam',
    e2: 'beam',
    e3: 'beam',
    e4: 'beam',
  },
  shortSpan: 4,
  longSpan: 5,
  deadLoad: 5,
  liveLoad: 2.5,
  finishes: 1.5,
  fcu: 30,
  fy: 460,
  slabThickness: 175,
  cover: 25,
  supportCondition: 'continuous-both-ends',
};

export function SlabInputForm({ onCalculate }: SlabInputFormProps) {
  const [values, setValues] = useState<SlabInput>(defaultValues);
  const [isDeclarationConfirmed, setIsDeclarationConfirmed] = useState(false);

  // Auto-derive panel type and edge continuity from 4-edge restraint
  useEffect(() => {
    const { e1_short, e2_short, e3_long, e4_long } = values.edgeRestraint;
    
    // Determine short edge continuity (both E1 and E2 must be continuous)
    const shortContinuous = e1_short === 'continuous' && e2_short === 'continuous';
    const shortCont: EdgeContinuity = shortContinuous ? 'continuous' : 'discontinuous';
    
    // Determine long edge continuity (both E3 and E4 must be continuous)
    const longContinuous = e3_long === 'continuous' && e4_long === 'continuous';
    const longCont: EdgeContinuity = longContinuous ? 'continuous' : 'discontinuous';
    
    // Auto-derive panel type
    const discShort = e1_short === 'discontinuous' || e2_short === 'discontinuous';
    const discLong = e3_long === 'discontinuous' || e4_long === 'discontinuous';
    
    let derivedPanel: 'interior' | 'edge' | 'corner' | 'cantilever' = 'interior';
    if (!discShort && !discLong) {
      derivedPanel = 'interior';
    } else if (discShort && discLong) {
      derivedPanel = 'corner';
    } else {
      derivedPanel = 'edge';
    }
    
    // Check for cantilever (any free edge)
    const supports = values.supportTypes;
    if (supports.e1 === 'free' || supports.e2 === 'free' || 
        supports.e3 === 'free' || supports.e4 === 'free' ||
        supports.e1 === 'cantilever' || supports.e2 === 'cantilever' ||
        supports.e3 === 'cantilever' || supports.e4 === 'cantilever') {
      derivedPanel = 'cantilever';
    }
    
    setValues(prev => ({
      ...prev,
      shortEdgeContinuity: shortCont,
      longEdgeContinuity: longCont,
      panelType: derivedPanel,
    }));
  }, [values.edgeRestraint, values.supportTypes]);

  const handleChange = (field: keyof SlabInput, value: string | number) => {
    if (field === 'slabType' || field === 'supportCondition' || field === 'slabId') {
      setValues((prev) => ({ ...prev, [field]: value as string }));
    } else {
      const numValue = parseFloat(value as string) || 0;
      setValues((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleEdgeRestraintChange = (edge: keyof typeof values.edgeRestraint, value: EdgeContinuity) => {
    setValues(prev => ({
      ...prev,
      edgeRestraint: { ...prev.edgeRestraint, [edge]: value }
    }));
  };

  const handleSupportTypeChange = (edge: keyof typeof values.supportTypes, value: SupportType) => {
    setValues(prev => ({
      ...prev,
      supportTypes: { ...prev.supportTypes, [edge]: value }
    }));
  };

  const handleReset = () => {
    setValues(defaultValues);
    setIsDeclarationConfirmed(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeclarationConfirmed) return;
    onCalculate(values);
  };

  const spanRatio = values.longSpan / values.shortSpan;
  const determinedSlabType = spanRatio > 2 ? 'one-way' : values.slabType;

  // Get derived panel info for display
  const getPanelDescription = () => {
    switch (values.panelType) {
      case 'interior': return 'All edges continuous';
      case 'edge': return 'One edge discontinuous';
      case 'corner': return 'Two adjacent edges discontinuous';
      case 'cantilever': return 'Free/cantilever edge detected';
    }
  };

  const numericFields: { key: keyof SlabInput; label: string; unit: string; min?: number }[] = [
    { key: "shortSpan", label: "Short Span (lx)", unit: "m", min: 0.5 },
    { key: "longSpan", label: "Long Span (ly)", unit: "m", min: 0.5 },
    { key: "deadLoad", label: "Dead Load (Gk)", unit: "kN/m²", min: 0 },
    { key: "liveLoad", label: "Live Load (Qk)", unit: "kN/m²", min: 0 },
    { key: "finishes", label: "Finishes", unit: "kN/m²", min: 0 },
    { key: "fcu", label: "Concrete Grade (fcu)", unit: "N/mm²", min: 20 },
    { key: "fy", label: "Steel Grade (fy)", unit: "N/mm²", min: 250 },
    { key: "slabThickness", label: "Slab Thickness (h)", unit: "mm", min: 100 },
    { key: "cover", label: "Cover to Steel", unit: "mm", min: 15 },
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Grid3X3 className="h-4 w-4 text-primary" />
          </div>
          Slab Declaration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1️⃣ SLAB IDENTIFICATION */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <span className="font-semibold text-sm">1️⃣ SLAB IDENTIFICATION</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Slab ID</Label>
                <Input
                  value={values.slabId || 'S1'}
                  onChange={(e) => handleChange('slabId', e.target.value)}
                  className="bg-muted/50 border-border/50 font-mono"
                  placeholder="S1"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Slab Type</Label>
                <Select 
                  value={values.slabType} 
                  onValueChange={(v) => handleChange('slabType', v as SlabType)}
                >
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-way">One-Way Slab</SelectItem>
                    <SelectItem value="two-way">Two-Way Slab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 2️⃣ PANEL GEOMETRY */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">2️⃣ PANEL GEOMETRY</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Short Span (Lx)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min={0.5}
                    value={values.shortSpan}
                    onChange={(e) => handleChange('shortSpan', e.target.value)}
                    className="pr-8 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Long Span (Ly)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min={0.5}
                    value={values.longSpan}
                    onChange={(e) => handleChange('longSpan', e.target.value)}
                    className="pr-8 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Aspect Ratio</Label>
                <div className="h-9 px-3 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="font-mono text-sm text-primary font-semibold">
                    {spanRatio.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Span Ratio Warning */}
            {spanRatio > 2 && values.slabType === 'two-way' && (
              <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-xs text-warning flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                ly/lx = {spanRatio.toFixed(2)} {">"} 2 → Will be designed as ONE-WAY slab
              </div>
            )}
          </div>

          {/* 3️⃣ EDGE RESTRAINT (ROOT-KEY INPUT) 🔑 */}
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <span className="font-semibold text-sm">3️⃣ EDGE RESTRAINT 🔑</span>
              <span className="text-xs text-muted-foreground">(Root-Key Input)</span>
            </div>
            
            <div className="text-xs text-muted-foreground mb-2">
              Declare each edge explicitly for precise moment coefficient matching:
            </div>
            
            <div className="grid gap-3">
              {/* Short span edges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">E1 (Short Span)</Label>
                  <Select 
                    value={values.edgeRestraint.e1_short} 
                    onValueChange={(v) => handleEdgeRestraintChange('e1_short', v as EdgeContinuity)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="discontinuous">Discontinuous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">E2 (Short Span)</Label>
                  <Select 
                    value={values.edgeRestraint.e2_short} 
                    onValueChange={(v) => handleEdgeRestraintChange('e2_short', v as EdgeContinuity)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="discontinuous">Discontinuous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Long span edges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">E3 (Long Span)</Label>
                  <Select 
                    value={values.edgeRestraint.e3_long} 
                    onValueChange={(v) => handleEdgeRestraintChange('e3_long', v as EdgeContinuity)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="discontinuous">Discontinuous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">E4 (Long Span)</Label>
                  <Select 
                    value={values.edgeRestraint.e4_long} 
                    onValueChange={(v) => handleEdgeRestraintChange('e4_long', v as EdgeContinuity)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuous">Continuous</SelectItem>
                      <SelectItem value="discontinuous">Discontinuous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            {/* AI-Derived Panel Type */}
            <div className="rounded-md bg-background/50 border border-border/50 p-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-xs">
                <span className="font-semibold">Auto-derived:</span>{' '}
                <span className="text-primary font-mono">{values.panelType.toUpperCase()}</span>
                <span className="text-muted-foreground"> — {getPanelDescription()}</span>
              </span>
            </div>
          </div>

          {/* 4️⃣ SUPPORT TYPE */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">4️⃣ SUPPORT TYPE</span>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {(['e1', 'e2', 'e3', 'e4'] as const).map((edge, i) => (
                <div key={edge} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {edge.toUpperCase()} ({i < 2 ? 'Short' : 'Long'})
                  </Label>
                  <Select 
                    value={values.supportTypes[edge]} 
                    onValueChange={(v) => handleSupportTypeChange(edge, v as SupportType)}
                  >
                    <SelectTrigger className="bg-muted/50 border-border/50 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wall">Wall</SelectItem>
                      <SelectItem value="beam">Beam</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="cantilever">Cantilever</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* 5️⃣ LOADING */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">5️⃣ LOADING</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dead Load (Gk)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={values.deadLoad}
                    onChange={(e) => handleChange('deadLoad', e.target.value)}
                    className="pr-14 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kN/m²</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Live Load (Qk)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={values.liveLoad}
                    onChange={(e) => handleChange('liveLoad', e.target.value)}
                    className="pr-14 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kN/m²</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Finishes</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    value={values.finishes}
                    onChange={(e) => handleChange('finishes', e.target.value)}
                    className="pr-14 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kN/m²</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6️⃣ MATERIAL & DESIGN STANDARD */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">6️⃣ DESIGN PARAMETERS</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {numericFields.filter(f => 
                ['fcu', 'fy', 'slabThickness', 'cover'].includes(f.key)
              ).map(({ key, label, unit, min }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="any"
                      min={min}
                      value={values[key] as number}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="pr-16 font-mono text-sm bg-muted/50 border-border/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                      {unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-xs text-primary font-mono">
              Design Standard: BS 8110-1:1997
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-muted/30">
            <input 
              type="checkbox" 
              id="confirm-declaration"
              checked={isDeclarationConfirmed}
              onChange={(e) => setIsDeclarationConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-border/50 bg-muted/50 text-primary focus:ring-primary/20"
            />
            <Label htmlFor="confirm-declaration" className="text-xs text-foreground cursor-pointer">
              I confirm the slab declaration and edge restraint configuration
            </Label>
          </div>

          {/* BS Reference Lock Indicator */}
          {isDeclarationConfirmed && (
            <div className="rounded-md bg-muted/30 border border-border/50 p-3 text-xs">
              <span className="font-semibold text-primary">BS 8110 Reference Lock:</span>
              <div className="mt-1 text-muted-foreground font-mono">
                {determinedSlabType === 'one-way' 
                  ? '• Table 3.10 (One-way slabs)'
                  : `• Table 3.14 (${values.panelType} panel coefficients)`
                }
                <br />
                • Clause 3.4 (Deflection) • Clause 3.5 (Shear)
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={!isDeclarationConfirmed}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium disabled:opacity-50"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Design
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="border-border/50 hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}