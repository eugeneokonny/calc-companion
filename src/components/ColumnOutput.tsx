import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, AlertTriangle, Copy, FileText, Columns } from 'lucide-react';
import { ColumnResult, CalculationStep } from '@/lib/columnCalculations';
import { useToast } from '@/hooks/use-toast';
import { ColumnDiagram } from './diagrams/ColumnDiagram';

interface ColumnOutputProps {
  result: ColumnResult | null;
}

const StatusIndicator: React.FC<{ status?: 'pass' | 'fail' | 'info' }> = ({ status }) => {
  if (status === 'pass') return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === 'fail') return <XCircle className="h-5 w-5 text-red-500" />;
  return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
};

const SectionHeader: React.FC<{ title: string; section: string }> = ({ title, section }) => (
  <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg mt-6 mb-4">
    <Badge variant="outline" className="font-bold">{section}</Badge>
    <h3 className="font-bold text-lg">{title}</h3>
  </div>
);

const FormulaBlock: React.FC<{ step: CalculationStep }> = ({ step }) => (
  <div className="border rounded-lg p-4 mb-4 bg-card">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Step {step.stepNumber}</Badge>
          <span className="font-semibold">{step.title}</span>
          <Badge variant="outline" className="text-xs">{step.reference}</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="font-mono bg-muted p-2 rounded">
            <div className="text-muted-foreground">Formula:</div>
            <div className="whitespace-pre-wrap">{step.formula}</div>
          </div>
          <div className="font-mono bg-muted/50 p-2 rounded">
            <div className="text-muted-foreground">Substitution:</div>
            <div className="whitespace-pre-wrap">{step.substitution}</div>
          </div>
          <div className="font-bold text-primary whitespace-pre-wrap">{step.result}</div>
          <div className="text-muted-foreground italic">{step.explanation}</div>
        </div>
      </div>
      <StatusIndicator status={step.status} />
    </div>
  </div>
);

const ColumnOutput: React.FC<ColumnOutputProps> = ({ result }) => {
  const { toast } = useToast();

  if (!result) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Design Output
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Columns className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Enter column parameters and click "Calculate Design" to see detailed BS 8110-1:1997 calculations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const copyToClipboard = () => {
    let text = "COLUMN DESIGN TO BS 8110-1:1997\n";
    text += "=".repeat(50) + "\n\n";
    
    result.steps.forEach(step => {
      text += `Step ${step.stepNumber}: ${step.title}\n`;
      text += `Reference: ${step.reference}\n`;
      text += `Formula: ${step.formula}\n`;
      text += `Substitution: ${step.substitution}\n`;
      text += `Result: ${step.result}\n`;
      text += `Note: ${step.explanation}\n\n`;
    });
    
    text += "\nDESIGN SUMMARY\n";
    text += "-".repeat(30) + "\n";
    text += `Column Type: ${result.summary.columnType}\n`;
    text += `Slenderness Ratio: ${result.summary.slendernessRatio.toFixed(2)}\n`;
    text += `Ultimate Load: ${result.summary.ultimateLoad.toFixed(2)} kN\n`;
    text += `Ultimate Moment: ${result.summary.ultimateMoment.toFixed(2)} kNm\n`;
    text += `Axial Capacity: ${result.summary.axialCapacity.toFixed(2)} kN\n`;
    text += `Moment Capacity: ${result.summary.momentCapacity.toFixed(2)} kNm\n`;
    text += `Reinforcement: ${result.summary.providedBars} (${result.summary.providedSteelArea.toFixed(0)} mm²)\n`;
    text += `Link Spacing: ${result.summary.linkSpacing} mm c/c\n`;
    text += `Utilization: ${result.summary.utilizationRatio.toFixed(1)}%\n`;
    text += `Overall Status: ${result.overallStatus}\n`;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Calculation summary has been copied to your clipboard.",
    });
  };

  // Group steps by section
  const loadingSteps = result.steps.filter(s => s.stepNumber <= 2);
  const classificationSteps = result.steps.filter(s => s.stepNumber >= 3 && s.stepNumber <= 5);
  const eccentricitySteps = result.steps.filter(s => s.stepNumber >= 6 && s.stepNumber <= 7);
  const capacitySteps = result.steps.filter(s => s.stepNumber >= 8 && s.stepNumber <= 10);
  const reinforcementSteps = result.steps.filter(s => s.stepNumber >= 11 && s.stepNumber <= 16);
  const linkSteps = result.steps.filter(s => s.stepNumber >= 17 && s.stepNumber <= 18);
  const verificationSteps = result.steps.filter(s => s.stepNumber >= 19);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Column Design Output (BS 8110-1:1997)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Status Banner */}
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          result.isValid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        }`}>
          {result.isValid ? (
            <CheckCircle className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
          <div>
            <h3 className={`font-bold text-lg ${result.isValid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
              Design is {result.overallStatus}
            </h3>
            <p className="text-sm text-muted-foreground">
              {result.summary.columnType} | Utilization: {result.summary.utilizationRatio.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Design Advisory for Inadequate Designs */}
        {!result.isValid && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <h4 className="font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Design Advisory
            </h4>
            {result.failureReasons.length > 0 && (
              <div className="mb-3">
                <p className="font-semibold text-sm mb-1">Issues Identified:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.failureReasons.map((reason, i) => (
                    <li key={i} className="text-red-700 dark:text-red-400">{reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.suggestions.length > 0 && (
              <div>
                <p className="font-semibold text-sm mb-1">Recommended Actions:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-amber-700 dark:text-amber-400">{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Section A: Loading */}
        <SectionHeader section="A" title="Loading Calculations" />
        {loadingSteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section B: Column Classification */}
        <SectionHeader section="B" title="Column Classification" />
        {classificationSteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section C: Minimum Eccentricity */}
        <SectionHeader section="C" title="Minimum Eccentricity Check" />
        {eccentricitySteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section D: Axial Capacity */}
        <SectionHeader section="D" title="Section Properties & Capacity" />
        {capacitySteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section E: Reinforcement Design */}
        <SectionHeader section="E" title="Reinforcement Design" />
        {reinforcementSteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section F: Link Design */}
        <SectionHeader section="F" title="Link Design" />
        {linkSteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Section G: Capacity Verification */}
        <SectionHeader section="G" title="Final Capacity Verification" />
        {verificationSteps.map(step => <FormulaBlock key={step.stepNumber} step={step} />)}

        {/* Summary Table */}
        <SectionHeader section="H" title="Design Summary" />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">Parameter</th>
                <th className="border p-2 text-left">Value</th>
                <th className="border p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">Column Type</td>
                <td className="border p-2">{result.summary.columnType}</td>
                <td className="border p-2">
                  <Badge variant={result.summary.isShortColumn ? "default" : "secondary"}>
                    {result.summary.isShortColumn ? "Short" : "Slender"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="border p-2">Slenderness Ratio (le/h)</td>
                <td className="border p-2">{result.summary.slendernessRatio.toFixed(2)}</td>
                <td className="border p-2">
                  <Badge variant={result.summary.slendernessRatio <= result.summary.slendernessLimit ? "default" : "destructive"}>
                    Limit: {result.summary.slendernessLimit}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="border p-2">Ultimate Axial Load</td>
                <td className="border p-2">{result.summary.ultimateLoad.toFixed(2)} kN</td>
                <td className="border p-2"><Badge variant="outline">Applied</Badge></td>
              </tr>
              <tr>
                <td className="border p-2">Axial Capacity</td>
                <td className="border p-2">{result.summary.axialCapacity.toFixed(2)} kN</td>
                <td className="border p-2">
                  <Badge variant={result.summary.axialCapacity >= result.summary.ultimateLoad ? "default" : "destructive"}>
                    {result.summary.axialCapacity >= result.summary.ultimateLoad ? "OK" : "FAIL"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="border p-2">Design Moment</td>
                <td className="border p-2">{result.summary.ultimateMoment.toFixed(2)} kNm</td>
                <td className="border p-2"><Badge variant="outline">Applied</Badge></td>
              </tr>
              <tr>
                <td className="border p-2">Moment Capacity</td>
                <td className="border p-2">{result.summary.momentCapacity.toFixed(2)} kNm</td>
                <td className="border p-2">
                  <Badge variant={result.summary.momentCapacity >= result.summary.ultimateMoment ? "default" : "destructive"}>
                    {result.summary.momentCapacity >= result.summary.ultimateMoment ? "OK" : "FAIL"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="border p-2">Required Steel Area</td>
                <td className="border p-2">{result.summary.requiredSteelArea.toFixed(0)} mm²</td>
                <td className="border p-2"><Badge variant="outline">Minimum</Badge></td>
              </tr>
              <tr>
                <td className="border p-2">Provided Reinforcement</td>
                <td className="border p-2">{result.summary.providedBars} ({result.summary.providedSteelArea.toFixed(0)} mm²)</td>
                <td className="border p-2">
                  <Badge variant={result.summary.providedSteelArea >= result.summary.requiredSteelArea ? "default" : "destructive"}>
                    {result.summary.providedSteelArea >= result.summary.requiredSteelArea ? "OK" : "FAIL"}
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="border p-2">Link Spacing</td>
                <td className="border p-2">{result.summary.linkSpacing} mm c/c</td>
                <td className="border p-2"><Badge variant="default">OK</Badge></td>
              </tr>
              <tr className="bg-muted/50 font-bold">
                <td className="border p-2">Utilization Ratio</td>
                <td className="border p-2">{result.summary.utilizationRatio.toFixed(1)}%</td>
                <td className="border p-2">
                  <Badge variant={result.isValid ? "default" : "destructive"}>
                    {result.overallStatus}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ColumnOutput;
