import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { BeamResult, CalculationStep } from "@/lib/beamCalculations";

interface CalculationOutputProps {
  result: BeamResult | null;
}

function StepDisplay({ step, index }: { step: CalculationStep; index: number }) {
  return (
    <div className="animate-slide-up border-l-2 border-primary/30 pl-4 py-3 hover:border-primary/60 transition-colors">
      <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
        {step.title}
        {step.isCheck && (
          step.checkPassed ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )
        )}
      </h4>
      
      {step.formula && (
        <p className="font-mono text-primary text-sm mb-1">
          {step.formula}
        </p>
      )}
      
      {step.substitution && (
        <p className="font-mono text-muted-foreground text-sm mb-1">
          {step.substitution}
        </p>
      )}
      
      <p className={`font-mono text-sm font-semibold ${
        step.isCheck 
          ? step.checkPassed 
            ? "text-success" 
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

export function CalculationOutput({ result }: CalculationOutputProps) {
  const { toast } = useToast();

  if (!result) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No Calculations Yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Enter your beam parameters and click Calculate to generate step-by-step design calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    const text = result.steps
      .map((step, i) => {
        let content = `${step.title}\n`;
        if (step.formula) content += `  Formula: ${step.formula}\n`;
        if (step.substitution) content += `  ${step.substitution}\n`;
        content += `  Result: ${step.result}`;
        if (step.explanation) content += `\n  Note: ${step.explanation}`;
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
          Design Calculations
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
              {result.summary.designValid ? "Design Satisfactory" : "Design Requires Review"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs">Moment</span>
              <span className="font-mono font-semibold">{result.summary.ultimateMoment.toFixed(1)} kN·m</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Tension Steel</span>
              <span className="font-mono font-semibold">{result.summary.tensionSteel.toFixed(0)} mm²</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Beam Type</span>
              <span className="font-mono font-semibold">
                {result.summary.isDoublyReinforced ? "Doubly" : "Singly"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs">Shear Stress</span>
              <span className="font-mono font-semibold">{result.summary.shearStress.toFixed(2)} N/mm²</span>
            </div>
          </div>
        </div>

        {/* Calculation Steps */}
        <div className="space-y-1">
          {result.steps.map((step, index) => (
            <StepDisplay key={index} step={step} index={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
