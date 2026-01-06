import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Footprints, ArrowDown, ArrowRight } from "lucide-react";
import type { StaircaseInput, StaircaseType, EndSupport, WaistType } from "@/lib/staircaseCalculations";

interface StaircaseInputFormProps {
  onCalculate: (input: StaircaseInput) => void;
}

export function StaircaseInputForm({ onCalculate }: StaircaseInputFormProps) {
  const [formData, setFormData] = useState({
    staircaseId: "ST1",
    staircaseType: "straight" as StaircaseType,
    waistType: "waist" as WaistType,
    endSupport: "simply-supported" as EndSupport,
    spanLength: "3.0",
    riserHeight: "175",
    goingLength: "250",
    numberOfRisers: "12",
    waistThickness: "150",
    landingLength: "0",
    fcu: "30",
    fy: "460",
    cover: "25",
    deadLoad: "1.0",
    liveLoad: "3.0",
    finishes: "1.0",
    stairWidth: "1200",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const input: StaircaseInput = {
      staircaseId: formData.staircaseId,
      staircaseType: formData.staircaseType,
      waistType: formData.waistType,
      endSupport: formData.endSupport,
      spanLength: parseFloat(formData.spanLength),
      riserHeight: parseFloat(formData.riserHeight),
      goingLength: parseFloat(formData.goingLength),
      numberOfRisers: parseInt(formData.numberOfRisers),
      waistThickness: parseFloat(formData.waistThickness),
      landingLength: parseFloat(formData.landingLength),
      fcu: parseFloat(formData.fcu),
      fy: parseFloat(formData.fy),
      cover: parseFloat(formData.cover),
      deadLoad: parseFloat(formData.deadLoad),
      liveLoad: parseFloat(formData.liveLoad),
      finishes: parseFloat(formData.finishes),
      stairWidth: parseFloat(formData.stairWidth),
    };

    onCalculate(input);
  };

  // Calculate 2R + G in real-time
  const twoRplusG = 2 * parseFloat(formData.riserHeight || "0") + parseFloat(formData.goingLength || "0");
  const geometryOK = twoRplusG >= 550 && twoRplusG <= 700;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Footprints className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Staircase Input Parameters</CardTitle>
            <CardDescription>BS 8110-1:1997 Compliant Design</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staircase Identification */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Staircase Identification
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staircaseId">Staircase ID</Label>
                <Input
                  id="staircaseId"
                  value={formData.staircaseId}
                  onChange={(e) => handleChange("staircaseId", e.target.value)}
                  placeholder="ST1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staircaseType">Type</Label>
                <Select value={formData.staircaseType} onValueChange={(v) => handleChange("staircaseType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight">Straight Flight</SelectItem>
                    <SelectItem value="dog-leg">Dog-Leg</SelectItem>
                    <SelectItem value="open-well">Open-Well</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waistType">Construction Type</Label>
                <Select value={formData.waistType} onValueChange={(v) => handleChange("waistType", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="waist">Waist Slab</SelectItem>
                    <SelectItem value="tread-slab">Tread Slab</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endSupport">End Support</Label>
                <Select value={formData.endSupport} onValueChange={(v) => handleChange("endSupport", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simply-supported">Simply Supported</SelectItem>
                    <SelectItem value="continuous-one-end">Continuous One End</SelectItem>
                    <SelectItem value="continuous-both-ends">Continuous Both Ends</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Step Geometry */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Step Geometry
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riserHeight" className="flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  Riser (mm)
                </Label>
                <Input
                  id="riserHeight"
                  type="number"
                  value={formData.riserHeight}
                  onChange={(e) => handleChange("riserHeight", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goingLength" className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" />
                  Going (mm)
                </Label>
                <Input
                  id="goingLength"
                  type="number"
                  value={formData.goingLength}
                  onChange={(e) => handleChange("goingLength", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfRisers">No. of Risers</Label>
                <Input
                  id="numberOfRisers"
                  type="number"
                  value={formData.numberOfRisers}
                  onChange={(e) => handleChange("numberOfRisers", e.target.value)}
                />
              </div>
            </div>
            
            {/* 2R+G Check Display */}
            <div className={`p-3 rounded-lg text-sm ${geometryOK ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              <span className="font-medium">2R + G = {twoRplusG}mm</span>
              <span className="ml-2">
                {geometryOK ? '✓ Within 550-700mm range' : '⚠ Outside 550-700mm range'}
              </span>
            </div>
          </div>

          {/* Slab Dimensions */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Slab Dimensions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="spanLength">Horizontal Span (m)</Label>
                <Input
                  id="spanLength"
                  type="number"
                  step="0.1"
                  value={formData.spanLength}
                  onChange={(e) => handleChange("spanLength", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waistThickness">Waist Thickness (mm)</Label>
                <Input
                  id="waistThickness"
                  type="number"
                  value={formData.waistThickness}
                  onChange={(e) => handleChange("waistThickness", e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stairWidth">Stair Width (mm)</Label>
                <Input
                  id="stairWidth"
                  type="number"
                  value={formData.stairWidth}
                  onChange={(e) => handleChange("stairWidth", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="landingLength">Landing Length (mm)</Label>
                <Input
                  id="landingLength"
                  type="number"
                  value={formData.landingLength}
                  onChange={(e) => handleChange("landingLength", e.target.value)}
                  placeholder="0 if none"
                />
              </div>
            </div>
          </div>

          {/* Material Properties */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Material Properties
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fcu">fcu (N/mm²)</Label>
                <Select value={formData.fcu} onValueChange={(v) => handleChange("fcu", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">C25</SelectItem>
                    <SelectItem value="30">C30</SelectItem>
                    <SelectItem value="35">C35</SelectItem>
                    <SelectItem value="40">C40</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fy">fy (N/mm²)</Label>
                <Select value={formData.fy} onValueChange={(v) => handleChange("fy", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="460">460</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Cover (mm)</Label>
                <Input
                  id="cover"
                  type="number"
                  value={formData.cover}
                  onChange={(e) => handleChange("cover", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Loading */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Loading (kN/m²)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadLoad">Additional Dead</Label>
                <Input
                  id="deadLoad"
                  type="number"
                  step="0.1"
                  value={formData.deadLoad}
                  onChange={(e) => handleChange("deadLoad", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="liveLoad">Live Load (Qk)</Label>
                <Select value={formData.liveLoad} onValueChange={(v) => handleChange("liveLoad", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.0">2.0 (Light residential)</SelectItem>
                    <SelectItem value="3.0">3.0 (Residential)</SelectItem>
                    <SelectItem value="4.0">4.0 (Public)</SelectItem>
                    <SelectItem value="5.0">5.0 (Heavy traffic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="finishes">Finishes</Label>
                <Input
                  id="finishes"
                  type="number"
                  step="0.1"
                  value={formData.finishes}
                  onChange={(e) => handleChange("finishes", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full gap-2">
            <Calculator className="h-4 w-4" />
            Calculate Staircase Design
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
