import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, AlertTriangle, Footprints, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { StaircaseResult } from "@/lib/staircaseCalculations";

interface StaircaseOutputProps {
  result: StaircaseResult | null;
}

function StatusIndicator({ status }: { status: 'safe' | 'review' | 'unsafe' | undefined }) {
  if (status === 'safe') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === 'review') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  if (status === 'unsafe') return <XCircle className="h-4 w-4 text-red-500" />;
  return null;
}

function SectionHeader({ title, bsRef }: { title: string; bsRef?: string }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      {bsRef && <Badge variant="outline" className="text-xs">{bsRef}</Badge>}
    </div>
  );
}

export function StaircaseOutput({ result }: StaircaseOutputProps) {
  const { toast } = useToast();

  if (!result) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Calculation Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Footprints className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-center">Enter staircase parameters and click Calculate to see results.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { steps, summary } = result;

  const copyToClipboard = () => {
    const text = `STAIRCASE DESIGN SUMMARY - ${summary.staircaseId}
========================================
Type: ${summary.staircaseType}
Construction: ${summary.waistType}
Support: ${summary.endSupport}

GEOMETRY:
- Horizontal Span: ${summary.spanLength}m
- Effective Span: ${summary.effectiveSpan.toFixed(3)}m
- Risers: ${summary.numberOfRisers} × ${summary.riserHeight}mm
- Going: ${summary.goingLength}mm
- Slope Angle: ${summary.slopeAngle.toFixed(1)}°
- Waist Thickness: ${summary.waistThickness}mm
- Effective Depth: ${summary.effectiveDepth.toFixed(0)}mm

LOADING:
- Self-weight: ${summary.selfWeight.toFixed(2)} kN/m²
- Ultimate Load: ${summary.ultimateLoad.toFixed(2)} kN/m²

DESIGN:
- Design Moment: ${summary.designMoment.toFixed(2)} kNm/m
- K-value: ${summary.kValue.toFixed(4)} (${summary.kStatus === 'safe' ? 'OK' : 'FAIL'})

REINFORCEMENT:
- Main Steel: ${summary.barSuggestion}
- Distribution: ${summary.distBarSuggestion}

CHECKS:
- Shear: v=${summary.shearStress.toFixed(3)} / vc=${summary.permissibleShear.toFixed(3)} (${summary.shearStatus === 'safe' ? 'OK' : 'FAIL'})
- Deflection: L/d=${summary.actualSpanDepth.toFixed(1)} / ${summary.allowableSpanDepth.toFixed(1)} (${summary.deflectionStatus === 'safe' ? 'OK' : 'FAIL'})

RESULT: ${summary.designValid ? 'DESIGN ADEQUATE' : 'DESIGN INADEQUATE'}

Design per BS 8110-1:1997`;

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Design summary copied successfully.",
    });
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              summary.designValid ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <Footprints className={`h-5 w-5 ${summary.designValid ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div>
              <CardTitle className="text-lg">
                {summary.staircaseId} - Design Results
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={summary.designValid ? "default" : "destructive"}>
                  {summary.designValid ? "ADEQUATE" : "INADEQUATE"}
                </Badge>
                <Badge variant="outline" className="text-xs">BS 8110</Badge>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Summary */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{summary.waistThickness}mm</p>
            <p className="text-xs text-muted-foreground">Waist Thickness</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{summary.designMoment.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Moment (kNm/m)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{summary.tensionSteel.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Steel (mm²/m)</p>
          </div>
        </div>

        {/* Status Checks */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 rounded-lg text-center text-xs ${summary.kStatus === 'safe' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
            K-value {summary.kStatus === 'safe' ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg text-center text-xs ${summary.shearStatus === 'safe' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
            Shear {summary.shearStatus === 'safe' ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg text-center text-xs ${summary.deflectionStatus === 'safe' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
            Deflection {summary.deflectionStatus === 'safe' ? '✓' : '✗'}
          </div>
        </div>

        {/* Reinforcement Summary */}
        <div className="p-4 border rounded-lg bg-primary/5">
          <h4 className="font-semibold mb-2">Reinforcement</h4>
          <div className="space-y-1 text-sm">
            <p><span className="text-muted-foreground">Main Steel:</span> {summary.barSuggestion}</p>
            <p><span className="text-muted-foreground">Distribution:</span> {summary.distBarSuggestion}</p>
          </div>
        </div>

        {/* Design Advisory if design failed */}
        {!summary.designValid && summary.failureReasons.length > 0 && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
            <div className="flex items-center gap-2 text-destructive mb-3">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Design Issues Found</span>
            </div>
            <ul className="space-y-2">
              {summary.failureReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-destructive mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-destructive/20">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Lightbulb className="h-4 w-4" />
                <span className="text-sm font-medium">Suggestions</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Consider increasing waist thickness, using higher concrete grade, or reducing span length.
              </p>
            </div>
          </div>
        )}

        {/* Detailed Steps */}
        <Accordion type="multiple" className="w-full">
          {steps.map((step, index) => (
            <AccordionItem key={index} value={`step-${index}`}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <StatusIndicator status={step.status} />
                  <span>{step.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm pl-6">
                  {step.formula && (
                    <div className="font-mono bg-muted/50 p-2 rounded text-xs">
                      {step.formula}
                    </div>
                  )}
                  {step.substitution && (
                    <div className="text-muted-foreground whitespace-pre-line">
                      {step.substitution}
                    </div>
                  )}
                  <div className="font-medium whitespace-pre-line">
                    {step.result}
                  </div>
                  {step.explanation && (
                    <div className={`p-2 rounded text-xs ${
                      step.status === 'safe' ? 'bg-green-500/10 text-green-700' :
                      step.status === 'review' ? 'bg-yellow-500/10 text-yellow-700' :
                      step.status === 'unsafe' ? 'bg-red-500/10 text-red-700' :
                      'bg-muted'
                    }`}>
                      {step.explanation}
                    </div>
                  )}
                  {step.bsReference && (
                    <Badge variant="outline" className="text-xs">{step.bsReference}</Badge>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
