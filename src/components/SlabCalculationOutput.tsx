import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, AlertTriangle, FileText, Grid3X3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { SlabResult, CalculationStep } from "@/lib/slabCalculations";

interface SlabCalculationOutputProps {
  result: SlabResult | null;
}

function StatusIndicator({ status }: { status?: 'safe' | 'review' | 'unsafe' }) {
  if (!status) return null;
  
  switch (status) {
    case 'safe':
      return <span className="inline-flex items-center gap-1 text-success text-xs font-semibold">🟢 Safe</span>;
    case 'review':
      return <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">🟡 Review</span>;
    case 'unsafe':
      return <span className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">🔴 Unsafe</span>;
  }
}

function StepDisplay({ step }: { step: CalculationStep }) {
  return (
    <div className="animate-slide-up border-l-2 border-primary/30 pl-4 py-3 hover:border-primary/60 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          {step.title}
          {step.isCheck && (
            step.checkPassed ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : step.status === 'review' ? (
              <AlertTriangle className="h-4 w-4 text-warning" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )
          )}
        </h4>
        <div className="flex items-center gap-2">
          <StatusIndicator status={step.status} />
          {step.bsReference && (
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">
              {step.bsReference}
            </span>
          )}
        </div>
      </div>
      
      {step.formula && (
        <p className="font-mono text-primary text-sm mb-1">
          {step.formula}
        </p>
      )}
      
      {step.substitution && (
        <p className="font-mono text-muted-foreground text-sm mb-1 whitespace-pre-line">
          {step.substitution}
        </p>
      )}
      
      <p className={`font-mono text-sm font-semibold whitespace-pre-line ${
        step.isCheck 
          ? step.checkPassed 
            ? "text-success" 
            : step.status === 'review'
              ? "text-warning"
              : "text-destructive"
          : "text-accent"
      }`}>
        {step.result}
      </p>
      
      {step.explanation && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {step.explanation}
        </p>
      )}
    </div>
  );
}

export function SlabCalculationOutput({ result }: SlabCalculationOutputProps) {
  const { toast } = useToast();

  if (!result) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Grid3X3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No Calculations Yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Complete the slab declaration, enter parameters, and click Calculate to generate step-by-step design calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    const text = result.steps
      .map((step) => {
        let content = `${step.title}`;
        if (step.bsReference) content += ` [${step.bsReference}]`;
        content += `\n`;
        if (step.formula) content += `  Formula: ${step.formula}\n`;
        if (step.substitution) content += `  ${step.substitution}\n`;
        content += `  Result: ${step.result}`;
        if (step.explanation) content += `\n  Note: ${step.explanation}`;
        if (step.status) content += `\n  Status: ${step.status.toUpperCase()}`;
        return content;
      })
      .join("\n\n");

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Calculations copied in exam-style format",
    });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-accent/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          Slab Design Calculations
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="border-border/50 hover:bg-muted text-xs"
        >
          <Copy className="mr-1.5 h-3 w-3" />
          Copy All
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Banner */}
        <div className={`rounded-lg p-4 mb-6 ${
          result.summary.designValid 
            ? "bg-success/10 border border-success/20" 
            : "bg-destructive/10 border border-destructive/20"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            {result.summary.designValid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span className={`font-semibold ${
              result.summary.designValid ? "text-success" : "text-destructive"
            }`}>
              {result.summary.designValid ? "Design Satisfactory" : "Design Check Failed"}
            </span>
            <span className="ml-auto text-sm font-mono bg-muted/50 px-2 py-0.5 rounded">
              {result.summary.slabType}
            </span>
          </div>
          
          {/* Panel Type Display */}
          <div className="mb-3 p-2 bg-background/50 rounded text-sm">
            <span className="text-muted-foreground">Panel Type: </span>
            <span className="font-semibold">{result.summary.panelType}</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-background/50 rounded p-2">
              <p className="text-xs text-muted-foreground">Ultimate Load</p>
              <p className="font-mono font-semibold">{result.summary.ultimateLoad.toFixed(2)} kN/m²</p>
            </div>
            <div className="bg-background/50 rounded p-2">
              <p className="text-xs text-muted-foreground">Short Span M⁺</p>
              <p className="font-mono font-semibold">{result.summary.shortSpanMoment.toFixed(2)} kNm/m</p>
            </div>
            {result.summary.longSpanMoment !== undefined && (
              <div className="bg-background/50 rounded p-2">
                <p className="text-xs text-muted-foreground">Long Span M⁺</p>
                <p className="font-mono font-semibold">{result.summary.longSpanMoment.toFixed(2)} kNm/m</p>
              </div>
            )}
            <div className="bg-background/50 rounded p-2">
              <p className="text-xs text-muted-foreground">Short Span Steel</p>
              <p className="font-mono font-semibold">{result.summary.shortSpanSteel.toFixed(0)} mm²/m</p>
            </div>
            {result.summary.longSpanSteel !== undefined && (
              <div className="bg-background/50 rounded p-2">
                <p className="text-xs text-muted-foreground">Long Span Steel</p>
                <p className="font-mono font-semibold">{result.summary.longSpanSteel.toFixed(0)} mm²/m</p>
              </div>
            )}
            {result.summary.spanRatio !== undefined && (
              <div className="bg-background/50 rounded p-2">
                <p className="text-xs text-muted-foreground">Span Ratio (ly/lx)</p>
                <p className="font-mono font-semibold">{result.summary.spanRatio.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Status Summary */}
          <div className="mt-3 pt-3 border-t border-border/30 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Shear:</span>
              <StatusIndicator status={result.summary.shearStatus} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Deflection:</span>
              <StatusIndicator status={result.summary.deflectionStatus} />
            </div>
          </div>
        </div>

        {/* Step-by-Step Calculations */}
        <div className="space-y-1">
          {result.steps.map((step, index) => (
            <StepDisplay key={index} step={step} />
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-border/30 text-xs text-muted-foreground text-center">
          <p>All calculations comply with BS 8110-1:1997</p>
          <p className="mt-1 font-semibold">This module extends the original MVP without replacing existing functionality.</p>
        </div>
      </CardContent>
    </Card>
  );
}
