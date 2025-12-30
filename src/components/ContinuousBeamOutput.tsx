import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, AlertTriangle, FileText, GitBranch, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DesignAdvisory } from "./DesignAdvisory";
import type { ContinuousBeamResult, CalculationStep, SpanResult } from "@/lib/continuousBeamCalculations";

interface ContinuousBeamOutputProps {
  result: ContinuousBeamResult | null;
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

function SpanResultCard({ span }: { span: SpanResult }) {
  return (
    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">Span {span.spanIndex}</span>
        <span className="text-xs text-muted-foreground font-mono">{span.length}m</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> M⁺
          </div>
          <div className="font-mono font-semibold text-success">{span.positiveMoment.toFixed(1)} kNm</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> M⁻
          </div>
          <div className="font-mono font-semibold text-warning">
            {Math.max(span.negativeMomentLeft, span.negativeMomentRight).toFixed(1)} kNm
          </div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">Shear</div>
          <div className="font-mono font-semibold">{Math.max(span.shearLeft, span.shearRight).toFixed(1)} kN</div>
        </div>
        <div className="bg-background/50 rounded p-2">
          <div className="text-muted-foreground">As</div>
          <div className="font-mono font-semibold">{span.tensionSteel.toFixed(0)} mm²</div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground font-mono">
        Links: T{span.linkSize}@{span.linkSpacing}mm c/c
      </div>
    </div>
  );
}

export function ContinuousBeamOutput({ result }: ContinuousBeamOutputProps) {
  const { toast } = useToast();

  if (!result) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No Calculations Yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Configure your continuous beam spans and click Analyze to generate step-by-step design calculations.
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

  // Convert suggestions to advisory format
  const advisoryFailures = result.summary.failureReasons?.map(reason => ({
    type: 'general' as const,
    description: reason,
    currentValue: 0,
    limitValue: 0,
    unit: ''
  })) || [];

  const advisoryAdvice = result.summary.suggestions?.map(s => ({
    priority: s.priority,
    action: s.action,
    reason: s.reason,
    effectiveness: s.effectiveness,
    category: 'geometry' as const
  })) || [];

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-accent/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-accent" />
          </div>
          Continuous Beam Analysis
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
      <CardContent className="space-y-6">
        {/* Summary Banner */}
        <div className={`rounded-lg p-4 ${
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
              {result.summary.designValid ? "Design Passed" : "Design Failed"}
            </span>
            <span className="ml-auto text-sm font-mono bg-muted/50 px-2 py-0.5 rounded">
              {result.summary.numberOfSpans}-Span Beam
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-background/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Max M⁺</span>
              <span className="font-mono font-semibold">{result.summary.maxPositiveMoment.toFixed(1)} kNm</span>
            </div>
            <div className="bg-background/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Max M⁻</span>
              <span className="font-mono font-semibold">{result.summary.maxNegativeMoment.toFixed(1)} kNm</span>
            </div>
            <div className="bg-background/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Max Shear</span>
              <span className="font-mono font-semibold">{result.summary.maxShear.toFixed(1)} kN</span>
            </div>
            <div className="bg-background/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Max Steel</span>
              <span className="font-mono font-semibold">{result.summary.maxTensionSteel.toFixed(0)} mm²</span>
            </div>
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

        {/* Design Advisory (when failed) */}
        {!result.summary.designValid && advisoryAdvice.length > 0 && (
          <DesignAdvisory 
            status="failed"
            failures={advisoryFailures}
            advice={advisoryAdvice}
          />
        )}

        {/* Span Results Grid */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Individual Span Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.spanResults.map((span) => (
              <SpanResultCard key={span.spanIndex} span={span} />
            ))}
          </div>
        </div>

        {/* Calculation Steps */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Step-by-Step Calculations
          </h3>
          <div className="space-y-1">
            {result.steps.map((step, index) => (
              <StepDisplay key={index} step={step} />
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-border/30 text-xs text-muted-foreground text-center">
          <p>All calculations comply with BS 8110-1:1997 Table 3.5</p>
          <p className="mt-1 font-semibold">This module extends the original MVP without replacing existing functionality.</p>
        </div>
      </CardContent>
    </Card>
  );
}
