import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, RotateCcw } from 'lucide-react';
import { ColumnInputs } from '@/lib/columnCalculations';

interface ColumnInputFormProps {
  onCalculate: (inputs: ColumnInputs) => void;
  isCalculating: boolean;
}

const ColumnInputForm: React.FC<ColumnInputFormProps> = ({ onCalculate, isCalculating }) => {
  const [inputs, setInputs] = useState<ColumnInputs>({
    columnHeight: 3000,
    columnWidth: 300,
    columnDepth: 300,
    effectiveLength: 2550,
    deadLoad: 800,
    liveLoad: 400,
    deadLoadMoment: 15,
    liveLoadMoment: 10,
    concreteGrade: 30,
    steelGrade: 460,
    cover: 35,
    mainBarDiameter: 20,
    linkDiameter: 8
  });

  const handleInputChange = (field: keyof ColumnInputs, value: string) => {
    const numValue = parseFloat(value) || 0;
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleSelectChange = (field: keyof ColumnInputs, value: string) => {
    const numValue = parseFloat(value);
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  const handleReset = () => {
    setInputs({
      columnHeight: 3000,
      columnWidth: 300,
      columnDepth: 300,
      effectiveLength: 2550,
      deadLoad: 800,
      liveLoad: 400,
      deadLoadMoment: 15,
      liveLoadMoment: 10,
      concreteGrade: 30,
      steelGrade: 460,
      cover: 35,
      mainBarDiameter: 20,
      linkDiameter: 8
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCalculate(inputs);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Column Design Input (BS 8110-1:1997)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Geometry Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b pb-2">Column Geometry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="columnHeight">Column Height (mm)</Label>
                <Input
                  id="columnHeight"
                  type="number"
                  value={inputs.columnHeight}
                  onChange={(e) => handleInputChange('columnHeight', e.target.value)}
                  min={1000}
                  step={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveLength">Effective Length, le (mm)</Label>
                <Input
                  id="effectiveLength"
                  type="number"
                  value={inputs.effectiveLength}
                  onChange={(e) => handleInputChange('effectiveLength', e.target.value)}
                  min={500}
                  step={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="columnWidth">Column Width, b (mm)</Label>
                <Input
                  id="columnWidth"
                  type="number"
                  value={inputs.columnWidth}
                  onChange={(e) => handleInputChange('columnWidth', e.target.value)}
                  min={200}
                  step={25}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="columnDepth">Column Depth, h (mm)</Label>
                <Input
                  id="columnDepth"
                  type="number"
                  value={inputs.columnDepth}
                  onChange={(e) => handleInputChange('columnDepth', e.target.value)}
                  min={200}
                  step={25}
                />
              </div>
            </div>
          </div>

          {/* Loading Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b pb-2">Applied Loads</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadLoad">Dead Load, Gk (kN)</Label>
                <Input
                  id="deadLoad"
                  type="number"
                  value={inputs.deadLoad}
                  onChange={(e) => handleInputChange('deadLoad', e.target.value)}
                  min={0}
                  step={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveLoad">Live Load, Qk (kN)</Label>
                <Input
                  id="liveLoad"
                  type="number"
                  value={inputs.liveLoad}
                  onChange={(e) => handleInputChange('liveLoad', e.target.value)}
                  min={0}
                  step={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadLoadMoment">Dead Load Moment, Mgk (kNm)</Label>
                <Input
                  id="deadLoadMoment"
                  type="number"
                  value={inputs.deadLoadMoment}
                  onChange={(e) => handleInputChange('deadLoadMoment', e.target.value)}
                  min={0}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveLoadMoment">Live Load Moment, Mqk (kNm)</Label>
                <Input
                  id="liveLoadMoment"
                  type="number"
                  value={inputs.liveLoadMoment}
                  onChange={(e) => handleInputChange('liveLoadMoment', e.target.value)}
                  min={0}
                  step={1}
                />
              </div>
            </div>
          </div>

          {/* Material Properties Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b pb-2">Material Properties</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concreteGrade">Concrete Grade, fcu (N/mm²)</Label>
                <Select
                  value={inputs.concreteGrade.toString()}
                  onValueChange={(value) => handleSelectChange('concreteGrade', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">C25 (25 N/mm²)</SelectItem>
                    <SelectItem value="30">C30 (30 N/mm²)</SelectItem>
                    <SelectItem value="35">C35 (35 N/mm²)</SelectItem>
                    <SelectItem value="40">C40 (40 N/mm²)</SelectItem>
                    <SelectItem value="45">C45 (45 N/mm²)</SelectItem>
                    <SelectItem value="50">C50 (50 N/mm²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="steelGrade">Steel Grade, fy (N/mm²)</Label>
                <Select
                  value={inputs.steelGrade.toString()}
                  onValueChange={(value) => handleSelectChange('steelGrade', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">Mild Steel (250 N/mm²)</SelectItem>
                    <SelectItem value="460">High Yield (460 N/mm²)</SelectItem>
                    <SelectItem value="500">High Yield (500 N/mm²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Reinforcement Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary border-b pb-2">Reinforcement Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cover">Concrete Cover (mm)</Label>
                <Select
                  value={inputs.cover.toString()}
                  onValueChange={(value) => handleSelectChange('cover', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 mm</SelectItem>
                    <SelectItem value="30">30 mm</SelectItem>
                    <SelectItem value="35">35 mm</SelectItem>
                    <SelectItem value="40">40 mm</SelectItem>
                    <SelectItem value="50">50 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mainBarDiameter">Main Bar Diameter (mm)</Label>
                <Select
                  value={inputs.mainBarDiameter.toString()}
                  onValueChange={(value) => handleSelectChange('mainBarDiameter', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12 mm</SelectItem>
                    <SelectItem value="16">16 mm</SelectItem>
                    <SelectItem value="20">20 mm</SelectItem>
                    <SelectItem value="25">25 mm</SelectItem>
                    <SelectItem value="32">32 mm</SelectItem>
                    <SelectItem value="40">40 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkDiameter">Link Diameter (mm)</Label>
                <Select
                  value={inputs.linkDiameter.toString()}
                  onValueChange={(value) => handleSelectChange('linkDiameter', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 mm</SelectItem>
                    <SelectItem value="8">8 mm</SelectItem>
                    <SelectItem value="10">10 mm</SelectItem>
                    <SelectItem value="12">12 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1" disabled={isCalculating}>
              <Calculator className="mr-2 h-4 w-4" />
              {isCalculating ? 'Calculating...' : 'Calculate Design'}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ColumnInputForm;
