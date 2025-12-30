import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calculator, RotateCcw, Plus, Minus, GitBranch } from "lucide-react";
import type { ContinuousBeamInput, ContinuousBeamSpan } from "@/lib/continuousBeamCalculations";

interface ContinuousBeamInputFormProps {
  onCalculate: (input: ContinuousBeamInput) => void;
}

const defaultSpan: ContinuousBeamSpan = {
  length: 6,
  deadLoad: 20,
  liveLoad: 10,
};

const defaultValues: Omit<ContinuousBeamInput, 'spans'> = {
  fcu: 30,
  fy: 460,
  width: 300,
  effectiveDepth: 450,
  cover: 35,
  includeSelfWeight: true,
  beamDepth: 500,
};

export function ContinuousBeamInputForm({ onCalculate }: ContinuousBeamInputFormProps) {
  const [spans, setSpans] = useState<ContinuousBeamSpan[]>([
    { ...defaultSpan },
    { ...defaultSpan },
  ]);
  const [values, setValues] = useState(defaultValues);

  const handleValueChange = (field: keyof typeof defaultValues, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setValues(prev => ({ ...prev, [field]: value }));
    } else {
      setValues(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
  };

  const handleSpanChange = (index: number, field: keyof ContinuousBeamSpan, value: string) => {
    const newSpans = [...spans];
    newSpans[index] = { ...newSpans[index], [field]: parseFloat(value) || 0 };
    setSpans(newSpans);
  };

  const addSpan = () => {
    if (spans.length < 5) {
      setSpans([...spans, { ...defaultSpan }]);
    }
  };

  const removeSpan = () => {
    if (spans.length > 2) {
      setSpans(spans.slice(0, -1));
    }
  };

  const handleReset = () => {
    setSpans([{ ...defaultSpan }, { ...defaultSpan }]);
    setValues(defaultValues);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate({ ...values, spans });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          Continuous Beam Parameters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Span Configuration */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-primary">Span Configuration</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={removeSpan}
                  disabled={spans.length <= 2}
                  className="h-7 w-7 p-0"
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                  {spans.length} spans
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addSpan}
                  disabled={spans.length >= 5}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {spans.map((span, index) => (
              <div key={index} className="bg-background/50 rounded-lg p-3 space-y-3">
                <div className="text-xs font-semibold text-muted-foreground">
                  Span {index + 1}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Length</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        value={span.length}
                        onChange={(e) => handleSpanChange(index, 'length', e.target.value)}
                        className="pr-8 font-mono text-sm bg-muted/50 border-border/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">m</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Dead Load</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={span.deadLoad}
                        onChange={(e) => handleSpanChange(index, 'deadLoad', e.target.value)}
                        className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kN/m</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Live Load</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={span.liveLoad}
                        onChange={(e) => handleSpanChange(index, 'liveLoad', e.target.value)}
                        className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">kN/m</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section Properties */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Section Properties
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Beam Width (b)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.width}
                    onChange={(e) => handleValueChange('width', e.target.value)}
                    className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Beam Depth (h)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.beamDepth}
                    onChange={(e) => handleValueChange('beamDepth', e.target.value)}
                    className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Effective Depth (d)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.effectiveDepth}
                    onChange={(e) => handleValueChange('effectiveDepth', e.target.value)}
                    className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cover to Steel</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.cover}
                    onChange={(e) => handleValueChange('cover', e.target.value)}
                    className="pr-12 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Material Properties */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Material Properties
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Concrete Grade (fcu)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.fcu}
                    onChange={(e) => handleValueChange('fcu', e.target.value)}
                    className="pr-16 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">N/mm²</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Steel Grade (fy)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={values.fy}
                    onChange={(e) => handleValueChange('fy', e.target.value)}
                    className="pr-16 font-mono text-sm bg-muted/50 border-border/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">N/mm²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Self Weight Toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 p-3">
            <div>
              <Label className="text-sm">Include Self-Weight</Label>
              <p className="text-xs text-muted-foreground">Automatically calculate beam weight (25 kN/m³)</p>
            </div>
            <Switch
              checked={values.includeSelfWeight}
              onCheckedChange={(checked) => handleValueChange('includeSelfWeight', checked)}
            />
          </div>

          {/* BS Reference */}
          <div className="rounded-md bg-muted/30 border border-border/50 p-3 text-xs">
            <span className="font-semibold text-primary">BS 8110 Reference:</span>
            <div className="mt-1 text-muted-foreground font-mono">
              • Table 3.5 (Moment & shear coefficients)
              <br />
              • Clause 3.4 (Deflection control)
              <br />
              • Clause 3.5 (Shear design)
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              <Calculator className="mr-2 h-4 w-4" />
              Analyze Beam
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
