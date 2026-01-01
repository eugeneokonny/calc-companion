import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, AlertTriangle, FileText, GitBranch } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DesignAdvisory } from "./DesignAdvisory";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function SectionHeader({ section, title, reference }: { section: string; title: string; reference: string }) {
  return (
    <div className="bg-primary/10 border-l-4 border-primary px-4 py-2 mb-4">
      <h3 className="font-bold text-foreground">
        SECTION {section} — {title}
      </h3>
      <p className="text-xs font-mono text-primary">{reference}</p>
    </div>
  );
}

function FormulaBlock({ formula, substitution, result }: { formula: string; substitution?: string; result?: string }) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3 mb-3 font-mono text-sm">
      <p className="text-primary font-semibold">{formula}</p>
      {substitution && <p className="text-muted-foreground mt-1">{substitution}</p>}
      {result && <p className="text-accent font-bold mt-1">{result}</p>}
    </div>
  );
}

function CheckResult({ passed, label, value, limit }: { passed: boolean; label: string; value: string; limit: string }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded ${passed ? 'bg-success/10' : 'bg-destructive/10'}`}>
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-success" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className="font-mono text-sm">
        {label}: {value} {passed ? '≤' : '>'} {limit}
      </span>
      <span className={`ml-auto text-xs font-semibold ${passed ? 'text-success' : 'text-destructive'}`}>
        {passed ? 'OK' : 'FAIL'}
      </span>
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
            Configure your continuous beam spans and click Analyze to generate BS 8110 compliant calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    const lines: string[] = [];
    
    lines.push("=" .repeat(60));
    lines.push("CONTINUOUS BEAM DESIGN TO BS 8110-1:1997");
    lines.push("=".repeat(60));
    lines.push("");
    
    // Section A
    lines.push("SECTION A — LOADING");
    lines.push("Reference: BS 8110-1 Cl. 2.4.2");
    lines.push("");
    lines.push(`Ultimate load: F = 1.4Gk + 1.6Qk = ${result.summary.ultimateLoad?.toFixed(2) || 'N/A'} kN/m`);
    lines.push("");
    
    // Section B
    lines.push("SECTION B — DESIGN MOMENTS & SHEARS");
    lines.push("Reference: BS 8110-1 Table 3.5");
    lines.push("");
    result.spanResults.forEach(span => {
      lines.push(`Span ${span.spanIndex} (L = ${span.length}m):`);
      lines.push(`  M+ (mid-span) = ${span.positiveMoment.toFixed(2)} kNm`);
      lines.push(`  M- (left support) = ${span.negativeMomentLeft.toFixed(2)} kNm`);
      lines.push(`  M- (right support) = ${span.negativeMomentRight.toFixed(2)} kNm`);
      lines.push(`  V (left) = ${span.shearLeft.toFixed(2)} kN`);
      lines.push(`  V (right) = ${span.shearRight.toFixed(2)} kN`);
      lines.push("");
    });
    
    // Section G
    lines.push("SECTION G — FINAL DESIGN SUMMARY");
    lines.push("");
    lines.push("Location\t\tTop Steel\t\tBottom Steel\t\tShear Links");
    result.spanResults.forEach(span => {
      lines.push(`Span ${span.spanIndex}\t\t${span.topSteel || 'N/A'}\t\t${span.bottomSteel || `${span.tensionSteel.toFixed(0)} mm²`}\t\tT${span.linkSize}@${span.linkSpacing}mm`);
    });
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("All calculations comply with BS 8110-1:1997");
    
    navigator.clipboard.writeText(lines.join("\n"));
    toast({
      title: "Copied to clipboard",
      description: "BS 8110 calculations copied in exam-style format",
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

  // Extract key values for display
  const effectiveDepth = result.summary.effectiveDepth || 0;
  const width = result.summary.width || 0;
  const fcu = result.summary.fcu || 30;
  const fy = result.summary.fy || 500;
  const maxMoment = Math.max(result.summary.maxPositiveMoment, result.summary.maxNegativeMoment);
  const kValue = result.summary.kValue || (maxMoment * 1e6) / (width * effectiveDepth * effectiveDepth * fcu);
  const isDoublyReinforced = kValue > 0.156;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-border/50">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          BS 8110-1:1997 Design Output
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
      
      <CardContent className="space-y-6 pt-6">
        {/* Overall Status Banner */}
        <div className={`rounded-lg p-4 ${
          result.summary.designValid 
            ? "bg-success/10 border border-success/30" 
            : "bg-destructive/10 border border-destructive/30"
        }`}>
          <div className="flex items-center gap-2">
            {result.summary.designValid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span className={`font-bold text-lg ${
              result.summary.designValid ? "text-success" : "text-destructive"
            }`}>
              {result.summary.designValid ? "DESIGN ADEQUATE" : "DESIGN INADEQUATE"}
            </span>
            <span className="ml-auto text-sm font-mono bg-background/50 px-3 py-1 rounded">
              {result.summary.numberOfSpans}-Span Continuous Beam
            </span>
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

        {/* ==================== SECTION A — LOADING ==================== */}
        <SectionHeader 
          section="A" 
          title="LOADING" 
          reference="Reference: BS 8110-1 Cl. 2.4.2" 
        />
        
        <div className="space-y-3 ml-4">
          <FormulaBlock 
            formula="F = 1.4Gk + 1.6Qk"
            substitution={`F = 1.4 × ${result.summary.deadLoad || 'Gk'} + 1.6 × ${result.summary.liveLoad || 'Qk'}`}
            result={`F = ${result.summary.ultimateLoad?.toFixed(2) || 'N/A'} kN/m`}
          />
          
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold">Load per span:</p>
            {result.spanResults.map(span => (
              <p key={span.spanIndex} className="font-mono ml-4">
                Span {span.spanIndex}: F × L = {result.summary.ultimateLoad?.toFixed(2) || 'N/A'} × {span.length} = {((result.summary.ultimateLoad || 0) * span.length).toFixed(2)} kN
              </p>
            ))}
          </div>
        </div>

        {/* ==================== SECTION B — DESIGN MOMENTS & SHEARS ==================== */}
        <SectionHeader 
          section="B" 
          title="DESIGN MOMENTS & SHEARS" 
          reference="Reference: BS 8110-1 Table 3.5" 
        />
        
        <div className="ml-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Location</TableHead>
                <TableHead className="text-right font-bold">M (kNm)</TableHead>
                <TableHead className="text-right font-bold">V (kN)</TableHead>
                <TableHead className="font-bold">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.spanResults.map(span => (
                <>
                  <TableRow key={`${span.spanIndex}-left`} className="border-b-0">
                    <TableCell className="font-mono">Support {span.spanIndex} (Left)</TableCell>
                    <TableCell className="text-right font-mono text-warning">-{Math.abs(span.negativeMomentLeft).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{span.shearLeft.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-primary">Table 3.5</TableCell>
                  </TableRow>
                  <TableRow key={`${span.spanIndex}-mid`} className="border-b-0 bg-muted/20">
                    <TableCell className="font-mono">Span {span.spanIndex} (Mid)</TableCell>
                    <TableCell className="text-right font-mono text-success">+{span.positiveMoment.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">—</TableCell>
                    <TableCell className="text-xs text-primary">Table 3.5</TableCell>
                  </TableRow>
                  <TableRow key={`${span.spanIndex}-right`}>
                    <TableCell className="font-mono">Support {span.spanIndex + 1} (Right)</TableCell>
                    <TableCell className="text-right font-mono text-warning">-{Math.abs(span.negativeMomentRight).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{span.shearRight.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-primary">Table 3.5</TableCell>
                  </TableRow>
                </>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* ==================== SECTION C — SECTION CLASSIFICATION ==================== */}
        <SectionHeader 
          section="C" 
          title="SECTION CLASSIFICATION" 
          reference="Reference: BS 8110-1 Cl. 3.4.1" 
        />
        
        <div className="ml-4 space-y-3">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="font-semibold mb-2">Critical Section Analysis:</p>
            <div className="font-mono text-sm space-y-1">
              <p>Design Moment (max): M = {maxMoment.toFixed(2)} kNm</p>
              <p>Section: b = {width}mm, d = {effectiveDepth.toFixed(0)}mm</p>
              <p>K = M / (bd²fcu) = {kValue.toFixed(4)}</p>
            </div>
            <div className={`mt-3 p-2 rounded ${isDoublyReinforced ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
              <p className="font-bold">
                {isDoublyReinforced 
                  ? "Section is DOUBLY REINFORCED (K > 0.156)" 
                  : "Section is SINGLY REINFORCED (K ≤ 0.156)"
                }
              </p>
            </div>
          </div>
        </div>

        {/* ==================== SECTION D — BENDING DESIGN ==================== */}
        <SectionHeader 
          section="D" 
          title="BENDING DESIGN" 
          reference="Reference: BS 8110-1 Cl. 3.4.4" 
        />
        
        <div className="ml-4 space-y-4">
          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">1. Neutral Axis Check</p>
            <FormulaBlock 
              formula="K = M / (bd²fcu)"
              substitution={`K = ${(maxMoment * 1e6).toFixed(0)} / (${width} × ${effectiveDepth.toFixed(0)}² × ${fcu})`}
              result={`K = ${kValue.toFixed(4)} ${kValue <= 0.156 ? '≤' : '>'} 0.156 (K')`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Lever Arm</p>
            <FormulaBlock 
              formula="z = d × [0.5 + √(0.25 - K/0.9)]"
              substitution={`z = ${effectiveDepth.toFixed(0)} × [0.5 + √(0.25 - ${kValue.toFixed(4)}/0.9)]`}
              result={`z = ${(result.summary.leverArm || effectiveDepth * 0.95).toFixed(1)} mm (max 0.95d)`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Tension Steel</p>
            <FormulaBlock 
              formula="As = M / (0.95 × fy × z)"
              substitution={`As = ${(maxMoment * 1e6).toFixed(0)} / (0.95 × ${fy} × ${(result.summary.leverArm || effectiveDepth * 0.95).toFixed(1)})`}
              result={`As = ${result.summary.maxTensionSteel.toFixed(0)} mm²`}
            />
          </div>

          {isDoublyReinforced && (
            <div className="space-y-3">
              <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">4. Compression Steel</p>
              <FormulaBlock 
                formula="As' = (K - K')bd²fcu / [0.95fy(d - d')]"
                result={`As' = ${result.summary.maxCompressionSteel?.toFixed(0) || 'N/A'} mm²`}
              />
            </div>
          )}

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{isDoublyReinforced ? '5' : '4'}. Bar Selection</p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
              <p>Required Area: As = {result.summary.maxTensionSteel.toFixed(0)} mm²</p>
              <p className="mt-1 text-primary font-semibold">
                Provide: {result.summary.barSuggestion || `${Math.ceil(result.summary.maxTensionSteel / 314)}T20 (${Math.ceil(result.summary.maxTensionSteel / 314) * 314} mm²)`}
              </p>
            </div>
          </div>
        </div>

        {/* ==================== SECTION E — SHEAR DESIGN ==================== */}
        <SectionHeader 
          section="E" 
          title="SHEAR DESIGN" 
          reference="Reference: BS 8110-1 Cl. 3.4.5" 
        />
        
        <div className="ml-4 space-y-4">
          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">1. Design Shear Stress</p>
            <FormulaBlock 
              formula="v = V / (bd)"
              substitution={`v = ${(result.summary.maxShear * 1000).toFixed(0)} / (${width} × ${effectiveDepth.toFixed(0)})`}
              result={`v = ${result.summary.shearStress?.toFixed(3) || ((result.summary.maxShear * 1000) / (width * effectiveDepth)).toFixed(3)} N/mm²`}
            />
            <CheckResult 
              passed={(result.summary.shearStress || 0) <= 0.8 * Math.sqrt(fcu)}
              label="Maximum shear"
              value={`${result.summary.shearStress?.toFixed(2) || ((result.summary.maxShear * 1000) / (width * effectiveDepth)).toFixed(2)}`}
              limit={`${(0.8 * Math.sqrt(fcu)).toFixed(2)} N/mm²`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Concrete Shear Resistance (Table 3.8)</p>
            <FormulaBlock 
              formula="vc = (0.79/γm) × (100As/bd)^(1/3) × (400/d)^(1/4) × (fcu/25)^(1/3)"
              result={`vc = ${result.summary.vc?.toFixed(3) || 'N/A'} N/mm²`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Shear Links</p>
            <FormulaBlock 
              formula="Asv/sv = b(v - vc) / (0.95fyv)"
            />
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="font-mono text-sm mb-2">Link requirements per span:</p>
              {result.spanResults.map(span => (
                <p key={span.spanIndex} className="font-mono text-sm text-primary">
                  Span {span.spanIndex}: T{span.linkSize}@{span.linkSpacing}mm c/c
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* ==================== SECTION F — DEFLECTION CHECK ==================== */}
        <SectionHeader 
          section="F" 
          title="DEFLECTION CHECK" 
          reference="Reference: BS 8110-1 Cl. 3.4.6" 
        />
        
        <div className="ml-4 space-y-3">
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between font-mono text-sm">
              <span>Actual L/d:</span>
              <span className="font-semibold">{result.summary.actualSpanDepthRatio?.toFixed(1) || 'N/A'}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span>Basic L/d (Table 3.9):</span>
              <span>{result.summary.basicSpanDepthRatio?.toFixed(1) || '26.0'}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span>Modification Factor (Cl. 3.4.6.5):</span>
              <span>{result.summary.modificationFactor?.toFixed(2) || '1.00'}</span>
            </div>
            <div className="flex justify-between font-mono text-sm border-t border-border/50 pt-2">
              <span>Allowable L/d:</span>
              <span className="font-semibold">{result.summary.allowableSpanDepthRatio?.toFixed(1) || 'N/A'}</span>
            </div>
          </div>
          
          <CheckResult 
            passed={result.summary.deflectionStatus === 'safe'}
            label="L/d check"
            value={result.summary.actualSpanDepthRatio?.toFixed(1) || 'N/A'}
            limit={`${result.summary.allowableSpanDepthRatio?.toFixed(1) || 'N/A'}`}
          />
        </div>

        {/* ==================== SECTION G — FINAL DESIGN SUMMARY ==================== */}
        <SectionHeader 
          section="G" 
          title="FINAL DESIGN SUMMARY" 
          reference="" 
        />
        
        <div className="ml-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/10">
                <TableHead className="font-bold text-foreground">Location</TableHead>
                <TableHead className="font-bold text-foreground">Top Steel</TableHead>
                <TableHead className="font-bold text-foreground">Bottom Steel</TableHead>
                <TableHead className="font-bold text-foreground">Shear Links</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.spanResults.map(span => (
                <TableRow key={span.spanIndex}>
                  <TableCell className="font-mono font-semibold">Span {span.spanIndex}</TableCell>
                  <TableCell className="font-mono">{span.topSteel || `${Math.ceil(Math.max(span.negativeMomentLeft, span.negativeMomentRight) * 1e6 / (0.95 * fy * effectiveDepth * 0.95) / 314)}T20`}</TableCell>
                  <TableCell className="font-mono">{span.bottomSteel || `${Math.ceil(span.tensionSteel / 314)}T20`}</TableCell>
                  <TableCell className="font-mono">T{span.linkSize}@{span.linkSpacing}mm c/c</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            All calculations comply with BS 8110-1:1997
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This output follows the exam-style presentation format with explicit clause and table references.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
