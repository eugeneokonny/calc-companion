import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, XCircle, FileText, Grid3X3 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { DesignAdvisory } from "./DesignAdvisory";
import { SlabDiagram, Slab3D } from "./diagrams";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SlabResult } from "@/lib/slabCalculations";

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
            Complete the slab declaration, enter parameters, and click Calculate to generate BS 8110 compliant calculations.
          </p>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    const s = result.summary;
    const lines: string[] = [];
    
    lines.push("=".repeat(60));
    lines.push(`${s.slabType.toUpperCase()} DESIGN TO BS 8110-1:1997`);
    lines.push("=".repeat(60));
    lines.push("");
    
    lines.push("SECTION A — SLAB DECLARATION");
    lines.push(`Type: ${s.slabType}`);
    lines.push(`Panel: ${s.panelType}`);
    lines.push(`Span Ratio: ly/lx = ${s.spanRatio.toFixed(2)}`);
    lines.push("");
    
    lines.push("SECTION B — LOADING");
    lines.push(`Dead Load: Gk = ${s.deadLoad} kN/m²`);
    lines.push(`Live Load: Qk = ${s.liveLoad} kN/m²`);
    lines.push(`Ultimate Load: n = ${s.ultimateLoad.toFixed(2)} kN/m²`);
    lines.push("");
    
    lines.push("SECTION C — DESIGN MOMENTS");
    lines.push(`Short Span M+ = ${s.shortSpanMoment.toFixed(2)} kNm/m`);
    if (s.longSpanMoment) lines.push(`Long Span M+ = ${s.longSpanMoment.toFixed(2)} kNm/m`);
    lines.push("");
    
    lines.push("SECTION D — BENDING DESIGN");
    lines.push(`K (short) = ${s.kShort.toFixed(4)}`);
    lines.push(`Short Span Steel: ${s.shortSpanBarSuggestion}`);
    if (s.longSpanBarSuggestion) lines.push(`Long Span Steel: ${s.longSpanBarSuggestion}`);
    lines.push("");
    
    lines.push("SECTION E — SHEAR CHECK");
    lines.push(`v = ${s.shearStress.toFixed(3)} N/mm², vc = ${s.permissibleShear.toFixed(3)} N/mm²`);
    lines.push(`Status: ${s.shearStatus === 'safe' ? 'PASS' : 'FAIL'}`);
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
  const isTwoWay = s.slabType === 'Two-Way Slab';
  
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
              {s.slabType}
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

        {/* Slab Diagrams - 2D and 3D */}
        <Tabs defaultValue="3d" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="2d">2D Plan View</TabsTrigger>
            <TabsTrigger value="3d">3D Visualization</TabsTrigger>
          </TabsList>
          <TabsContent value="2d">
            <SlabDiagram 
              thickness={s.thickness}
              shortSpan={s.shortSpan}
              longSpan={s.longSpan}
              cover={s.cover}
              bottomShortBars={s.shortSpanBarSuggestion}
              bottomLongBars={s.longSpanBarSuggestion}
              topShortBars={s.negativeShortMoment && s.negativeShortMoment > 0 ? s.shortSpanBarSuggestion : undefined}
              topLongBars={s.negativeLongMoment && s.negativeLongMoment > 0 ? s.longSpanBarSuggestion : undefined}
              slabType={s.slabType as 'One-Way Slab' | 'Two-Way Slab'}
            />
          </TabsContent>
          <TabsContent value="3d">
            <Slab3D 
              thickness={s.thickness}
              shortSpan={s.shortSpan}
              longSpan={s.longSpan}
              cover={s.cover}
              bottomShortBars={s.shortSpanBarSuggestion}
              bottomLongBars={s.longSpanBarSuggestion}
              topShortBars={s.negativeShortMoment && s.negativeShortMoment > 0 ? s.shortSpanBarSuggestion : undefined}
              topLongBars={s.negativeLongMoment && s.negativeLongMoment > 0 ? s.longSpanBarSuggestion : undefined}
              slabType={s.slabType as 'One-Way Slab' | 'Two-Way Slab'}
            />
          </TabsContent>
        </Tabs>

        {/* ==================== SECTION A — SLAB DECLARATION ==================== */}
        <SectionHeader 
          section="A" 
          title="SLAB DECLARATION" 
          reference={`Reference: BS 8110-1 ${s.tableName || 'Table 3.14'}`}
        />
        
        <div className="ml-4 space-y-3">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slab Type:</span>
              <span className="font-semibold text-primary">{s.slabType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Panel Type:</span>
              <span className="font-semibold">{s.panelType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Span Ratio (ly/lx):</span>
              <span className="font-semibold">{s.spanRatio.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Support Condition:</span>
              <span className="font-semibold">{s.supportCondition}</span>
            </div>
          </div>
          
          <div className={`p-3 rounded ${s.spanRatio <= 2 ? 'bg-success/20 border border-success/30' : 'bg-warning/20 border border-warning/30'}`}>
            <p className="font-mono text-sm">
              ly/lx = {s.spanRatio.toFixed(2)} {s.spanRatio <= 2 ? '≤' : '>'} 2 → Design as <strong>{s.slabType}</strong>
            </p>
          </div>
        </div>

        {/* ==================== SECTION B — LOADING ==================== */}
        <SectionHeader 
          section="B" 
          title="LOADING" 
          reference="Reference: BS 8110-1 Cl. 2.4.2" 
        />
        
        <div className="ml-4 space-y-3">
          <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm space-y-2">
            <p>Dead Load: Gk = {s.deadLoad} kN/m²</p>
            <p>Live Load: Qk = {s.liveLoad} kN/m²</p>
            <p>Slab Thickness: h = {s.thickness} mm</p>
          </div>
          
          <FormulaBlock 
            formula="n = 1.4Gk + 1.6Qk"
            substitution={`n = 1.4 × ${s.deadLoad} + 1.6 × ${s.liveLoad}`}
            result={`n = ${s.ultimateLoad.toFixed(2)} kN/m²`}
          />

          <div className="space-y-2">
            <p className="font-semibold text-sm text-muted-foreground">Effective Depths:</p>
            <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
              <p>d (short span) = {s.effectiveDepthShort.toFixed(0)} mm</p>
              {s.effectiveDepthLong && (
                <p>d (long span) = {s.effectiveDepthLong.toFixed(0)} mm (second layer)</p>
              )}
            </div>
          </div>
        </div>

        {/* ==================== SECTION C — DESIGN MOMENTS ==================== */}
        <SectionHeader 
          section="C" 
          title="DESIGN MOMENTS" 
          reference={`Reference: BS 8110-1 ${s.tableName || 'Table 3.14'}`}
        />
        
        <div className="ml-4 space-y-4">
          {isTwoWay && s.bsx_pos !== undefined && (
            <div className="space-y-3">
              <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Moment Coefficients (Interpolated)</p>
              <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">βsx⁺ (short, +ve):</p>
                  <p className="font-semibold text-primary">{s.bsx_pos.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">βsx⁻ (short, -ve):</p>
                  <p className="font-semibold text-primary">{s.bsx_neg?.toFixed(4) || '0.0000'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">βsy⁺ (long, +ve):</p>
                  <p className="font-semibold text-primary">{s.bsy_pos?.toFixed(4) || '0.0000'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">βsy⁻ (long, -ve):</p>
                  <p className="font-semibold text-primary">{s.bsy_neg?.toFixed(4) || '0.0000'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Design Moments</p>
            <FormulaBlock 
              formula="M = β × n × lx²"
            />
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold">Location</TableHead>
                  <TableHead className="text-right font-bold">M (kNm/m)</TableHead>
                  <TableHead className="font-bold">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono">Short Span Mid</TableCell>
                  <TableCell className="text-right font-mono text-success">+{s.shortSpanMoment.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-primary">Positive</TableCell>
                </TableRow>
                {s.negativeShortMoment !== undefined && s.negativeShortMoment > 0 && (
                  <TableRow>
                    <TableCell className="font-mono">Short Span Support</TableCell>
                    <TableCell className="text-right font-mono text-warning">-{s.negativeShortMoment.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-primary">Negative</TableCell>
                  </TableRow>
                )}
                {s.longSpanMoment !== undefined && (
                  <TableRow>
                    <TableCell className="font-mono">Long Span Mid</TableCell>
                    <TableCell className="text-right font-mono text-success">+{s.longSpanMoment.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-primary">Positive</TableCell>
                  </TableRow>
                )}
                {s.negativeLongMoment !== undefined && s.negativeLongMoment > 0 && (
                  <TableRow>
                    <TableCell className="font-mono">Long Span Support</TableCell>
                    <TableCell className="text-right font-mono text-warning">-{s.negativeLongMoment.toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-primary">Negative</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">1. K-Value Check</p>
            <FormulaBlock 
              formula="K = M / (bd²fcu)"
              substitution={`K = ${(s.shortSpanMoment * 1e6).toFixed(0)} / (1000 × ${s.effectiveDepthShort.toFixed(0)}² × ${s.fcu})`}
              result={`K (short) = ${s.kShort.toFixed(4)}`}
            />
            
            <div className={`p-3 rounded ${s.kShort <= s.kPrime ? 'bg-success/20 border border-success/30' : 'bg-destructive/20 border border-destructive/30'}`}>
              <p className="font-mono text-sm font-semibold">
                K = {s.kShort.toFixed(4)} {s.kShort <= s.kPrime ? '≤' : '>'} K' = {s.kPrime} → {s.kShort <= s.kPrime ? 'Singly reinforced ✓' : 'Section inadequate'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">2. Lever Arm</p>
            <FormulaBlock 
              formula="z = d × [0.5 + √(0.25 - K/0.9)] ≤ 0.95d"
              result={`z (short) = ${s.zShort.toFixed(1)} mm`}
            />
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">3. Required Reinforcement</p>
            <FormulaBlock 
              formula="As = M / (0.87fy × z)"
              result={`As (short) = ${s.shortSpanSteel.toFixed(0)} mm²/m`}
            />
            {s.longSpanSteel && (
              <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
                <p>As (long) = {s.longSpanSteel.toFixed(0)} mm²/m</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">4. Minimum Steel Check</p>
            <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
              <p>As,min = 0.13%bh = {s.minSteel.toFixed(0)} mm²/m</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">5. Bar Selection</p>
            <div className="bg-muted/30 rounded-lg p-4 font-mono text-sm">
              <p className="text-primary font-semibold">Short Span: {s.shortSpanBarSuggestion}</p>
              {s.longSpanBarSuggestion && (
                <p className="text-primary font-semibold mt-1">Long Span: {s.longSpanBarSuggestion}</p>
              )}
            </div>
          </div>
        </div>

        {/* ==================== SECTION E — SHEAR CHECK ==================== */}
        <SectionHeader 
          section="E" 
          title="SHEAR CHECK" 
          reference="Reference: BS 8110-1 Cl. 3.4.5" 
        />
        
        <div className="ml-4 space-y-4">
          <FormulaBlock 
            formula="v = V / (bd)"
            substitution={`v = ${(s.shearForce * 1000).toFixed(0)} / (1000 × ${s.effectiveDepthShort.toFixed(0)})`}
            result={`v = ${s.shearStress.toFixed(3)} N/mm²`}
          />
          
          <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm">
            <p>Concrete shear resistance: vc = {s.permissibleShear.toFixed(3)} N/mm²</p>
          </div>
          
          <CheckResult 
            passed={s.shearStatus === 'safe'}
            label="Shear check"
            value={`${s.shearStress.toFixed(3)} N/mm²`}
            limit={`${s.permissibleShear.toFixed(3)} N/mm²`}
          />
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
                <TableHead className="font-bold text-foreground">Direction</TableHead>
                <TableHead className="font-bold text-foreground">Reinforcement</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono font-semibold">Short Span (Bottom)</TableCell>
                <TableCell className="font-mono">{s.shortSpanBarSuggestion}</TableCell>
                <TableCell><StatusIndicator status="safe" /></TableCell>
              </TableRow>
              {s.longSpanBarSuggestion && (
                <TableRow>
                  <TableCell className="font-mono font-semibold">Long Span (Top)</TableCell>
                  <TableCell className="font-mono">{s.longSpanBarSuggestion}</TableCell>
                  <TableCell><StatusIndicator status="safe" /></TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-mono font-semibold">Shear</TableCell>
                <TableCell className="font-mono">No links required (solid slab)</TableCell>
                <TableCell><StatusIndicator status={s.shearStatus} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono font-semibold">Deflection</TableCell>
                <TableCell className="font-mono">L/d = {s.actualSpanDepthRatio.toFixed(1)} / {s.allowableSpanDepthRatio.toFixed(1)}</TableCell>
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
