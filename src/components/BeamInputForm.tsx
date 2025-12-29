import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, RotateCcw } from "lucide-react";
import type { BeamInput } from "@/lib/beamCalculations";

interface BeamInputFormProps {
  onCalculate: (input: BeamInput) => void;
}

const defaultValues: BeamInput = {
  span: 6,
  deadLoad: 15,
  liveLoad: 10,
  fcu: 30,
  fy: 460,
  width: 300,
  effectiveDepth: 450,
  cover: 35,
};

export function BeamInputForm({ onCalculate }: BeamInputFormProps) {
  const [values, setValues] = useState<BeamInput>(defaultValues);

  const handleChange = (field: keyof BeamInput, value: string) => {
    const numValue = parseFloat(value) || 0;
    setValues((prev) => ({ ...prev, [field]: numValue }));
  };

  const handleReset = () => {
    setValues(defaultValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(values);
  };

  const inputFields: { key: keyof BeamInput; label: string; unit: string; min?: number }[] = [
    { key: "span", label: "Span Length", unit: "m", min: 0.5 },
    { key: "deadLoad", label: "Dead Load (Gk)", unit: "kN/m", min: 0 },
    { key: "liveLoad", label: "Live Load (Qk)", unit: "kN/m", min: 0 },
    { key: "fcu", label: "Concrete Grade (fcu)", unit: "N/mm²", min: 20 },
    { key: "fy", label: "Steel Grade (fy)", unit: "N/mm²", min: 250 },
    { key: "width", label: "Beam Width (b)", unit: "mm", min: 150 },
    { key: "effectiveDepth", label: "Effective Depth (d)", unit: "mm", min: 200 },
    { key: "cover", label: "Cover to Steel", unit: "mm", min: 20 },
  ];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          Design Parameters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {inputFields.map(({ key, label, unit, min }) => (
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
                    value={values[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="pr-14 font-mono text-sm bg-muted/50 border-border/50 focus:border-primary/50 focus:ring-primary/20"
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
