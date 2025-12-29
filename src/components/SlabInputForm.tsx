import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, RotateCcw, Grid3X3 } from "lucide-react";
import type { SlabInput } from "@/lib/slabCalculations";

interface SlabInputFormProps {
  onCalculate: (input: SlabInput) => void;
}

const defaultValues: SlabInput = {
  slabType: 'two-way',
  shortSpan: 4,
  longSpan: 5,
  deadLoad: 5,
  liveLoad: 2.5,
  fcu: 30,
  fy: 460,
  slabThickness: 175,
  cover: 25,
  supportCondition: 'simply-supported',
};

export function SlabInputForm({ onCalculate }: SlabInputFormProps) {
  const [values, setValues] = useState<SlabInput>(defaultValues);

  const handleChange = (field: keyof SlabInput, value: string | number) => {
    if (field === 'slabType' || field === 'supportCondition') {
      setValues((prev) => ({ ...prev, [field]: value as string }));
    } else {
      const numValue = parseFloat(value as string) || 0;
      setValues((prev) => ({ ...prev, [field]: numValue }));
    }
  };

  const handleReset = () => {
    setValues(defaultValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(values);
  };

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
          {/* Slab Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Slab Type</Label>
              <Select 
                value={values.slabType} 
                onValueChange={(v) => handleChange('slabType', v)}
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

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
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
