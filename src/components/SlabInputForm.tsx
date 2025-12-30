import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, RotateCcw, Grid3X3, AlertCircle } from "lucide-react";
import type { SlabInput, SlabType, PanelType, EdgeContinuity } from "@/lib/slabCalculations";

interface SlabInputFormProps {
  onCalculate: (input: SlabInput) => void;
}

const defaultValues: SlabInput = {
  slabType: 'two-way',
  panelType: 'interior',
  shortEdgeContinuity: 'continuous',
  longEdgeContinuity: 'continuous',
  shortSpan: 4,
  longSpan: 5,
  deadLoad: 5,
  liveLoad: 2.5,
  fcu: 30,
  fy: 460,
  slabThickness: 175,
  cover: 25,
  supportCondition: 'continuous-both-ends',
};

export function SlabInputForm({ onCalculate }: SlabInputFormProps) {
  const [values, setValues] = useState<SlabInput>(defaultValues);
  const [isDeclarationConfirmed, setIsDeclarationConfirmed] = useState(false);

  const handleChange = (field: keyof SlabInput, value: string | number) => {
    if (field === 'slabType' || field === 'supportCondition' || field === 'panelType' || 
        field === 'shortEdgeContinuity' || field === 'longEdgeContinuity') {
      setValues((prev) => ({ ...prev, [field]: value as string }));
    } else {
      const numValue = parseFloat(value as string) || 0;
      setValues((prev) => ({ ...prev, [field]: numValue }));
    }
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

  const numericFields: { key: keyof SlabInput; label: string; unit: string; min?: number }[] = [
    { key: "shortSpan", label: "Short Span (lx)", unit: "m", min: 0.5 },
    { key: "longSpan", label: "Long Span (ly)", unit: "m", min: 0.5 },
    { key: "deadLoad", label: "Dead Load (Gk)", unit: "kN/m²", min: 0 },
    { key: "liveLoad", label: "Live Load (Qk)", unit: "kN/m²", min: 0 },
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
          Slab Parameters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Slab Declaration Section */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold text-sm">Step 1: Slab Declaration (Required)</span>
            </div>
            
            {/* Slab Type */}
            <div className="grid grid-cols-2 gap-4">
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
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Panel Type</Label>
                <Select 
                  value={values.panelType} 
                  onValueChange={(v) => handleChange('panelType', v as PanelType)}
                >
                  <SelectTrigger className="bg-muted/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interior">Interior Panel</SelectItem>
                    <SelectItem value="edge">Edge Panel</SelectItem>
                    <SelectItem value="corner">Corner Panel</SelectItem>
                    <SelectItem value="cantilever">Cantilever Panel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Edge Continuity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Short Edge Continuity</Label>
                <Select 
                  value={values.shortEdgeContinuity} 
                  onValueChange={(v) => handleChange('shortEdgeContinuity', v as EdgeContinuity)}
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
                <Label className="text-xs text-muted-foreground">Long Edge Continuity</Label>
                <Select 
                  value={values.longEdgeContinuity} 
                  onValueChange={(v) => handleChange('longEdgeContinuity', v as EdgeContinuity)}
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

            {/* Support Condition */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Support Condition</Label>
              <Select 
                value={values.supportCondition} 
                onValueChange={(v) => handleChange('supportCondition', v)}
              >
                <SelectTrigger className="bg-muted/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simply-supported">Simply Supported</SelectItem>
                  <SelectItem value="continuous-one-end">Continuous One End</SelectItem>
                  <SelectItem value="continuous-both-ends">Continuous Both Ends</SelectItem>
                  <SelectItem value="cantilever">Cantilever</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Span Ratio Warning */}
            {spanRatio > 2 && values.slabType === 'two-way' && (
              <div className="rounded-md bg-warning/10 border border-warning/30 p-2 text-xs text-warning">
                ⚠️ ly/lx = {spanRatio.toFixed(2)} {">"} 2 → Will be designed as ONE-WAY slab
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="confirm-declaration"
                checked={isDeclarationConfirmed}
                onChange={(e) => setIsDeclarationConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-border/50 bg-muted/50 text-primary focus:ring-primary/20"
              />
              <Label htmlFor="confirm-declaration" className="text-xs text-foreground cursor-pointer">
                Confirm slab type and panel configuration
              </Label>
            </div>
          </div>

          {/* Numeric Inputs */}
          <div className="grid grid-cols-2 gap-4">
            {numericFields.map(({ key, label, unit, min }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="text-xs text-muted-foreground">
                  {label}
                </Label>
                <div className="relative">
                  <Input
                    id={key}
                    type="number"
                    step="any"
                    min={min}
                    value={values[key] as number}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="pr-16 font-mono text-sm bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* BS Reference Lock Indicator */}
          {isDeclarationConfirmed && (
            <div className="rounded-md bg-muted/30 border border-border/50 p-3 text-xs">
              <span className="font-semibold text-primary">BS 8110 Reference Lock:</span>
              <div className="mt-1 text-muted-foreground font-mono">
                {determinedSlabType === 'one-way' 
                  ? '• Table 3.10 (One-way slabs)'
                  : '• Table 3.14 (Two-way coefficients)'
                }
                <br />
                • Clause 3.4 (Deflection)
                <br />
                • Clause 3.5 (Shear)
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
