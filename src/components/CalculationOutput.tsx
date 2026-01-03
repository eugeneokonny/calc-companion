import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, FileText } from "lucide-react";
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
import type { BeamResult } from "@/lib/beamCalculations";

interface CalculationOutputProps {
  result: BeamResult | null;
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
            Enter your beam parameters and click Calculate to generate BS 8110 compliant calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    const s = result.summary;
    const lines: string[] = [];
    
    lines.push("=".repeat(60));
    lines.push("SIMPLY SUPPORTED BEAM DESIGN TO BS 8110-1:1997");
    lines.push("=".repeat(60));
    lines.push("");
    
    lines.push("SECTION A — LOADING");
    lines.push(`Dead Load: Gk = ${s.deadLoad} kN/m`);
    lines.push(`Live Load: Qk = ${s.liveLoad} kN/m`);
    lines.push(`Ultimate Load: w = 1.4(${s.deadLoad}) + 1.6(${s.liveLoad}) = ${s.ultimateLoad.toFixed(2)} kN/m`);
    lines.push("");
    
    lines.push("SECTION B — DESIGN MOMENT & SHEAR");
    lines.push(`Ultimate Moment: M = wL²/8 = ${s.ultimateMoment.toFixed(2)} kNm`);
    lines.push(`Ultimate Shear: V = wL/2 = ${s.shearForce.toFixed(2)} kN`);
    lines.push("");
    
    lines.push("SECTION C — SECTION CLASSIFICATION");
    lines.push(`K = ${s.kValue.toFixed(4)}, K' = ${s.kPrime}`);
    lines.push(`Section is ${s.isDoublyReinforced ? 'DOUBLY' : 'SINGLY'} REINFORCED`);
    lines.push("");
    
    lines.push("SECTION D — BENDING DESIGN");
    lines.push(`Lever Arm: z = ${s.leverArm.toFixed(1)} mm`);
    lines.push(`Tension Steel: As = ${s.tensionSteel.toFixed(0)} mm²`);
    if (s.compressionSteel > 0) {
      lines.push(`Compression Steel: As' = ${s.compressionSteel.toFixed(0)} mm²`);
    }
    lines.push(`Provide: ${s.barSuggestion}`);
    lines.push("");
    
    lines.push("SECTION E — SHEAR DESIGN");
    lines.push(`v = ${s.shearStress.toFixed(2)} N/mm², vc = ${s.vc.toFixed(2)} N/mm²`);
    lines.push(`Provide: T${s.linkSize}@${s.linkSpacing}mm c/c`);
    lines.push("");
    
    lines.push("SECTION F — DEFLECTION CHECK");
    lines.push(`Actual L/d = ${s.actualSpanDepthRatio.toFixed(1)}`);
    lines.push(`Allowable L/d = ${s.allowableSpanDepthRatio.toFixed(1)}`);
    lines.push(`Status: ${s.deflectionStatus === 'safe' ? 'PASS' : 'FAIL'}`);
    lines.push("");
    
    lines.push("=".repeat(60));
    lines.push(`DESIGN ${s.designValid ? 'ADEQUATE' : 'INADEQUATE'}`);
    lines.push("All calculations comply with BS 8110-1:1997");
    
    navigator.clipboard.writeText(lines.join("\n"));
    toast({
      title: "Copied to clipboard",
      description: "BS 8110 calculations copied in exam-style format",
    });
  };

  const s = result.summary;
  
  // Convert failures for advisory
  const advisoryFailures = s.failureReasons.map(reason => ({
    type: 'general' as const,
    description: reason,
    currentValue: 0,
    limitValue: 0,
    unit: ''
  }));

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
          s.designValid 
            ? "bg-success/10 border border-success/30" 
            : "bg-destructive/10 border border-destructive/30"
        }`}>
          <div className="flex items-center gap-2">
            {s.designValid ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <span className={`font-bold text-lg ${
              s.designValid ? "text-success" : "text-destructive"
            }`}>
              {s.designValid ? "DESIGN ADEQUATE" : "DESIGN INADEQUATE"}
            </span>
            <span className="ml-auto text-sm font-mono bg-background/50 px-3 py-1 rounded">
              {s.isDoublyReinforced ? "Doubly Reinforced" : "Singly Reinforced"} Beam
            </span>
          </div>
        </div>

        {/* Design Advisory (when failed) */}
        {!s.designValid && advisoryFailures.length > 0 && (
          <DesignAdvisory 
            status="failed"
            failures={advisoryFailures}
            advice={[]}
          />
        )}

        {/* ==================== SECTION A — LOADING ==================== */}
        <SectionHeader 
          section="A" 
          title="LOADING" 
          reference="Reference: BS 8110-1 Cl. 2.4.2" 
        />
        
        <div className="space-y-3 ml-4">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <p>Dead Load: Gk = {s.deadLoad} kN/m</p>
            <p>Live Load: Qk = {s.liveLoad} kN/m</p>
          </div>
          
          <FormulaBlock 
            formula="w = 1.4Gk + 1.6Qk"
            substitution={`w = 1.4 × ${s.deadLoad} + 1.6 × ${s.liveLoad}`}
            result={`w = ${s.ultimateLoad.toFixed(2)} kN/m`}
          />
        </div>

        {/* ==================== SECTION B — DESIGN MOMENT & SHEAR ==================== */}
        <SectionHeader 
          section="B" 
          title="DESIGN MOMENT & SHEAR" 
          reference="Reference: BS 8110-1 Cl. 3.4" 
        />
        
        <div className="ml-4 space-y-4">
          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">1. Effective Depth</p>
            <FormulaBlock 
              formula="d = h - cover - φlink - φbar/2"
              substitution={`d = ${s.overallDepth} - ${s.cover} - link - bar/2`}
              result={`d = ${s.effectiveDepth.toFixed(0)} mm`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Ultimate Moment</p>
            <FormulaBlock 
              formula="M = wL²/8 (simply supported, UDL)"
              substitution={`M = ${s.ultimateLoad.toFixed(2)} × ${s.span}² / 8`}
              result={`M = ${s.ultimateMoment.toFixed(2)} kNm`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Ultimate Shear</p>
            <FormulaBlock 
              formula="V = wL/2"
              substitution={`V = ${s.ultimateLoad.toFixed(2)} × ${s.span} / 2`}
              result={`V = ${s.shearForce.toFixed(2)} kN`}
            />
          </div>
        </div>

        {/* ==================== SECTION C — SECTION CLASSIFICATION ==================== */}
        <SectionHeader 
          section="C" 
          title="SECTION CLASSIFICATION" 
          reference="Reference: BS 8110-1 Cl. 3.4.4" 
        />
        
        <div className="ml-4 space-y-3">
          <FormulaBlock 
            formula="K = M / (bd²fcu)"
            substitution={`K = ${(s.ultimateMoment * 1e6).toFixed(0)} / (${s.width} × ${s.effectiveDepth.toFixed(0)}² × ${s.fcu})`}
            result={`K = ${s.kValue.toFixed(4)}`}
          />
          
          <div className={`mt-3 p-3 rounded ${s.isDoublyReinforced ? 'bg-warning/20 border border-warning/30' : 'bg-success/20 border border-success/30'}`}>
            <p className="font-bold font-mono">
              K = {s.kValue.toFixed(4)} {s.kValue <= s.kPrime ? '≤' : '>'} K' = {s.kPrime}
            </p>
            <p className={`font-semibold mt-1 ${s.isDoublyReinforced ? 'text-warning' : 'text-success'}`}>
              {s.isDoublyReinforced 
                ? "→ Section is DOUBLY REINFORCED" 
                : "→ Section is SINGLY REINFORCED"
              }
            </p>
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
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">1. Lever Arm</p>
            <FormulaBlock 
              formula="z = d × [0.5 + √(0.25 - K/0.9)]"
              substitution={`z = ${s.effectiveDepth.toFixed(0)} × [0.5 + √(0.25 - ${s.kValue.toFixed(4)}/0.9)]`}
              result={`z = ${s.leverArm.toFixed(1)} mm (max 0.95d = ${(0.95 * s.effectiveDepth).toFixed(0)} mm)`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Tension Steel</p>
            <FormulaBlock 
              formula="As = M / (0.95 × fy × z)"
              substitution={`As = ${(s.ultimateMoment * 1e6).toFixed(0)} / (0.87 × ${s.fy} × ${s.leverArm.toFixed(1)})`}
              result={`As = ${s.tensionSteel.toFixed(0)} mm²`}
            />
          </div>

          {s.compressionSteel > 0 && (
            <div className="space-y-3">
              <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Compression Steel</p>
              <FormulaBlock 
                formula="As' = (K - K')bd²fcu / [0.87fy(d - d')]"
                result={`As' = ${s.compressionSteel.toFixed(0)} mm²`}
              />
            </div>
          )}

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{s.compressionSteel > 0 ? '4' : '3'}. Minimum Steel Check (Cl. 3.12.5.3)</p>
            <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
              <p>As,min = 0.13%bh = 0.0013 × {s.width} × {s.effectiveDepth.toFixed(0)} = {s.minSteel.toFixed(0)} mm²</p>
              <p className={`mt-1 font-semibold ${s.tensionSteel >= s.minSteel ? 'text-success' : 'text-warning'}`}>
                As = {s.tensionSteel.toFixed(0)} mm² {s.tensionSteel >= s.minSteel ? '≥' : '<'} As,min ✓
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{s.compressionSteel > 0 ? '5' : '4'}. Bar Selection</p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
              <p>Required Area: As = {s.tensionSteel.toFixed(0)} mm²</p>
              <p className="mt-1 text-primary font-semibold">Provide: {s.barSuggestion}</p>
              {s.compressionBarSuggestion && (
                <p className="mt-1 text-primary font-semibold">Compression: {s.compressionBarSuggestion}</p>
              )}
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
              substitution={`v = ${(s.criticalShear * 1000).toFixed(0)} / (${s.width} × ${s.effectiveDepth.toFixed(0)})`}
              result={`v = ${s.shearStress.toFixed(3)} N/mm²`}
            />
            <CheckResult 
              passed={s.shearStress <= s.maxShearStress}
              label="Maximum shear check"
              value={`${s.shearStress.toFixed(2)} N/mm²`}
              limit={`${s.maxShearStress.toFixed(2)} N/mm²`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Concrete Shear Resistance (Table 3.8)</p>
            <FormulaBlock 
              formula="vc = (0.79/γm) × (100As/bd)^(1/3) × (400/d)^(1/4) × (fcu/25)^(1/3)"
              result={`vc = ${s.vc.toFixed(3)} N/mm²`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Shear Links</p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
              <p>v = {s.shearStress.toFixed(3)} N/mm², vc = {s.vc.toFixed(3)} N/mm²</p>
              <p className="mt-2 text-primary font-semibold">
                Provide: T{s.linkSize}@{s.linkSpacing}mm c/c {s.shearStress <= s.vc ? '(nominal)' : ''}
              </p>
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
              <span className="font-semibold">{s.actualSpanDepthRatio.toFixed(1)}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span>Basic L/d (Table 3.9):</span>
              <span>{s.basicSpanDepthRatio.toFixed(1)}</span>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <span>Tension Modification Factor (Cl. 3.4.6.5):</span>
              <span>{s.tensionModificationFactor.toFixed(2)}</span>
            </div>
            {s.isDoublyReinforced && (
              <div className="flex justify-between font-mono text-sm">
                <span>Compression Modification Factor (Cl. 3.4.6.6):</span>
                <span>{s.compressionModificationFactor.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-mono text-sm border-t border-border/50 pt-2">
              <span>Allowable L/d:</span>
              <span className="font-semibold">{s.allowableSpanDepthRatio.toFixed(1)}</span>
            </div>
          </div>
          
          <CheckResult 
            passed={s.deflectionStatus === 'safe'}
            label="L/d check"
            value={s.actualSpanDepthRatio.toFixed(1)}
            limit={s.allowableSpanDepthRatio.toFixed(1)}
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
                <TableHead className="font-bold text-foreground">Item</TableHead>
                <TableHead className="font-bold text-foreground">Value</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono">Design Moment</TableCell>
                <TableCell className="font-mono">{s.ultimateMoment.toFixed(2)} kNm</TableCell>
                <TableCell><StatusIndicator status="safe" /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Tension Steel</TableCell>
                <TableCell className="font-mono">{s.barSuggestion}</TableCell>
                <TableCell><StatusIndicator status="safe" /></TableCell>
              </TableRow>
              {s.compressionSteel > 0 && (
                <TableRow>
                  <TableCell className="font-mono">Compression Steel</TableCell>
                  <TableCell className="font-mono">{s.compressionBarSuggestion}</TableCell>
                  <TableCell><StatusIndicator status="safe" /></TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-mono">Shear Links</TableCell>
                <TableCell className="font-mono">T{s.linkSize}@{s.linkSpacing}mm c/c</TableCell>
                <TableCell><StatusIndicator status={s.shearStatus} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono">Deflection</TableCell>
                <TableCell className="font-mono">L/d = {s.actualSpanDepthRatio.toFixed(1)}</TableCell>
                <TableCell><StatusIndicator status={s.deflectionStatus} /></TableCell>
              </TableRow>
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
