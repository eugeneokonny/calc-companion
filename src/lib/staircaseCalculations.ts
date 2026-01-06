// Staircase Slab Design per BS 8110-1:1997

export type StaircaseType = 'straight' | 'dog-leg' | 'open-well';
export type EndSupport = 'simply-supported' | 'continuous-one-end' | 'continuous-both-ends';
export type WaistType = 'waist' | 'tread-slab';

export interface StaircaseInput {
  staircaseId: string;
  staircaseType: StaircaseType;
  waistType: WaistType;
  endSupport: EndSupport;
  // Geometry
  spanLength: number; // m (horizontal projection)
  riserHeight: number; // mm
  goingLength: number; // mm (tread depth)
  numberOfRisers: number;
  waistThickness: number; // mm
  landingLength: number; // mm (at each end, if any)
  // Material
  fcu: number; // N/mm²
  fy: number; // N/mm²
  cover: number; // mm
  // Loading
  deadLoad: number; // kN/m² (self-weight calculated separately)
  liveLoad: number; // kN/m² (typically 3.0 for residential, 4.0 for public)
  finishes: number; // kN/m²
  // Optional
  stairWidth: number; // mm (for shear check)
}

export interface CalculationStep {
  title: string;
  formula?: string;
  substitution?: string;
  result: string;
  explanation?: string;
  isCheck?: boolean;
  checkPassed?: boolean;
  status?: 'safe' | 'review' | 'unsafe';
  bsReference?: string;
}

export interface StaircaseResult {
  steps: CalculationStep[];
  summary: {
    staircaseId: string;
    staircaseType: string;
    waistType: string;
    endSupport: string;
    spanLength: number;
    riserHeight: number;
    goingLength: number;
    numberOfRisers: number;
    waistThickness: number;
    stairWidth: number;
    fcu: number;
    fy: number;
    cover: number;
    // Calculated
    effectiveSpan: number;
    slopeAngle: number;
    selfWeight: number;
    ultimateLoad: number;
    effectiveDepth: number;
    designMoment: number;
    kValue: number;
    kPrime: number;
    leverArm: number;
    tensionSteel: number;
    distributionSteel: number;
    minSteel: number;
    barSuggestion: string;
    distBarSuggestion: string;
    shearForce: number;
    shearStress: number;
    permissibleShear: number;
    basicSpanDepthRatio: number;
    tensionModFactor: number;
    allowableSpanDepth: number;
    actualSpanDepth: number;
    // Status
    kStatus: 'safe' | 'unsafe';
    shearStatus: 'safe' | 'unsafe';
    deflectionStatus: 'safe' | 'unsafe';
    designValid: boolean;
    failureReasons: string[];
  };
}

// BS8110 Table 3.9 - Basic span/effective depth ratios
function getBasicSpanDepthRatio(support: EndSupport): number {
  switch (support) {
    case 'simply-supported': return 20;
    case 'continuous-one-end': return 23; // Average of simply supported and continuous
    case 'continuous-both-ends': return 26;
    default: return 20;
  }
}

// Tension reinforcement modification factor (BS8110 Cl. 3.4.6.5)
function getTensionModificationFactor(M: number, b: number, d: number, fy: number): number {
  const fs = (2 * fy * M) / (3 * b * d * d);
  const factor = 0.55 + (477 - fs) / (120 * (0.9 + M / (b * d * d)));
  return Math.min(Math.max(factor, 0.55), 2.0);
}

// Calculate permissible shear stress vc (BS8110 Cl. 3.4.5.4)
function calculateVc(As: number, b: number, d: number, fcu: number): number {
  const ratio = Math.min((100 * As) / (b * d), 3);
  const depthFactor = Math.pow(400 / d, 0.25);
  const fcuFactor = Math.pow(fcu / 25, 1/3);
  return (0.79 * Math.pow(ratio, 1/3) * Math.max(depthFactor, 0.67) * Math.min(fcuFactor, 1.0)) / 1.25;
}

// Suggest bar arrangement
function suggestBars(area: number, fy: number = 460): { suggestion: string; area: number; spacing: number } {
  const options = [
    { dia: 10, spacing: 150, area: 524 },
    { dia: 10, spacing: 200, area: 393 },
    { dia: 12, spacing: 150, area: 754 },
    { dia: 12, spacing: 200, area: 566 },
    { dia: 12, spacing: 250, area: 452 },
    { dia: 16, spacing: 150, area: 1340 },
    { dia: 16, spacing: 200, area: 1005 },
    { dia: 16, spacing: 250, area: 804 },
    { dia: 20, spacing: 150, area: 2094 },
    { dia: 20, spacing: 200, area: 1571 },
  ];
  
  const maxSpacing = fy <= 250 ? 300 : 200;
  
  for (const opt of options) {
    if (opt.area >= area && opt.spacing <= maxSpacing) {
      return { 
        suggestion: `T${opt.dia}@${opt.spacing}mm c/c (${opt.area} mm²/m)`,
        area: opt.area,
        spacing: opt.spacing
      };
    }
  }
  
  return { 
    suggestion: "T20@150mm c/c or use larger bars",
    area: 2094,
    spacing: 150
  };
}

// Get moment coefficient based on support condition
function getMomentCoefficient(support: EndSupport): { positive: number; negative: number } {
  switch (support) {
    case 'simply-supported': return { positive: 0.125, negative: 0 };
    case 'continuous-one-end': return { positive: 0.090, negative: 0.090 };
    case 'continuous-both-ends': return { positive: 0.063, negative: 0.083 };
    default: return { positive: 0.125, negative: 0 };
  }
}

export function calculateStaircaseDesign(input: StaircaseInput): StaircaseResult {
  const steps: CalculationStep[] = [];
  const failureReasons: string[] = [];
  const gamma_dead = 1.4;
  const gamma_live = 1.6;
  const K_prime = 0.156;
  const concreteWeight = 25; // kN/m³

  // Assume 12mm bars
  const barDiameter = 12;
  const effectiveDepth = input.waistThickness - input.cover - barDiameter / 2;

  // Calculate slope angle
  const slopeAngle = Math.atan(input.riserHeight / input.goingLength) * (180 / Math.PI);
  const slopeRad = slopeAngle * (Math.PI / 180);

  // STEP 0: Staircase Declaration
  const typeLabels: Record<StaircaseType, string> = {
    'straight': 'Straight Flight Staircase',
    'dog-leg': 'Dog-Leg Staircase',
    'open-well': 'Open-Well Staircase'
  };

  const waistLabels: Record<WaistType, string> = {
    'waist': 'Waist Slab Type (longitudinal spanning)',
    'tread-slab': 'Tread Slab Type (transverse spanning)'
  };

  const supportLabels: Record<EndSupport, string> = {
    'simply-supported': 'Simply Supported at Both Ends',
    'continuous-one-end': 'Continuous at One End',
    'continuous-both-ends': 'Continuous at Both Ends'
  };

  steps.push({
    title: "STAIRCASE DECLARATION",
    result: `Staircase ID: ${input.staircaseId}
Type: ${typeLabels[input.staircaseType]}
Construction: ${waistLabels[input.waistType]}
Support: ${supportLabels[input.endSupport]}
Risers: ${input.numberOfRisers} × ${input.riserHeight}mm
Going: ${input.goingLength}mm
Waist: ${input.waistThickness}mm thick`,
    explanation: "Design in accordance with BS 8110-1:1997",
    bsReference: 'BS8110 Cl. 3.10',
    status: 'safe'
  });

  // STEP 1: Geometry Verification (2R + G check)
  const twoRplusG = 2 * input.riserHeight + input.goingLength;
  const geometryOK = twoRplusG >= 550 && twoRplusG <= 700;

  steps.push({
    title: "Step 1: Geometry Verification",
    formula: "2R + G should be between 550mm and 700mm",
    substitution: `2 × ${input.riserHeight} + ${input.goingLength}`,
    result: `2R + G = ${twoRplusG}mm`,
    isCheck: true,
    checkPassed: geometryOK,
    status: geometryOK ? 'safe' : 'review',
    explanation: geometryOK 
      ? `${twoRplusG}mm is within 550-700mm range ✓`
      : `${twoRplusG}mm is outside recommended 550-700mm range`,
    bsReference: 'Building Regs Part K'
  });

  // STEP 2: Slope Angle
  steps.push({
    title: "Step 2: Slope Angle Calculation",
    formula: "θ = arctan(R/G)",
    substitution: `θ = arctan(${input.riserHeight}/${input.goingLength})`,
    result: `θ = ${slopeAngle.toFixed(2)}°`,
    explanation: `Typical range: 25° to 42° for residential stairs`,
    status: slopeAngle > 42 ? 'review' : 'safe'
  });

  // STEP 3: Effective Span
  // For waist type: effective span = horizontal span + half landing at each end
  const landingContribution = input.landingLength > 0 ? input.landingLength / 1000 : 0;
  const effectiveSpan = input.spanLength + landingContribution;

  steps.push({
    title: "Step 3: Effective Span",
    formula: "L_eff = Horizontal span + Landing contribution",
    substitution: `L_eff = ${input.spanLength}m + ${landingContribution.toFixed(2)}m`,
    result: `L_eff = ${effectiveSpan.toFixed(3)}m`,
    bsReference: 'BS8110 Cl. 3.10.1.3'
  });

  // STEP 4: Self-Weight Calculation
  // Self-weight on slope = waist thickness × concrete weight / cos(θ)
  const waistSelfWeight = (input.waistThickness / 1000) * concreteWeight / Math.cos(slopeRad);
  
  // Add step weight (triangular portion of steps)
  const stepSelfWeight = 0.5 * (input.riserHeight / 1000) * concreteWeight;
  
  const totalSelfWeight = waistSelfWeight + stepSelfWeight;

  steps.push({
    title: "Step 4: Self-Weight Calculation",
    formula: `Waist: (h_waist × γ_concrete) / cos(θ)
Steps: 0.5 × R × γ_concrete`,
    substitution: `Waist: (${input.waistThickness}/1000 × ${concreteWeight}) / cos(${slopeAngle.toFixed(1)}°)
Steps: 0.5 × ${input.riserHeight}/1000 × ${concreteWeight}`,
    result: `Waist weight: ${waistSelfWeight.toFixed(2)} kN/m²
Step weight: ${stepSelfWeight.toFixed(2)} kN/m²
Total self-weight: ${totalSelfWeight.toFixed(2)} kN/m²`,
    bsReference: 'BS8110 Cl. 3.10.1.2'
  });

  // STEP 5: Ultimate Load
  const totalDeadLoad = totalSelfWeight + input.deadLoad + input.finishes;
  const ultimateLoad = gamma_dead * totalDeadLoad + gamma_live * input.liveLoad;

  steps.push({
    title: "Step 5: Ultimate Design Load",
    formula: "n = 1.4 × Gk + 1.6 × Qk",
    substitution: `Gk = ${totalSelfWeight.toFixed(2)} + ${input.deadLoad} + ${input.finishes} = ${totalDeadLoad.toFixed(2)} kN/m²
n = 1.4 × ${totalDeadLoad.toFixed(2)} + 1.6 × ${input.liveLoad}`,
    result: `n = ${ultimateLoad.toFixed(2)} kN/m²`,
    bsReference: 'BS8110 Cl. 2.4.3'
  });

  // STEP 6: Effective Depth
  steps.push({
    title: "Step 6: Effective Depth",
    formula: "d = h - cover - φ/2",
    substitution: `d = ${input.waistThickness} - ${input.cover} - ${barDiameter}/2`,
    result: `d = ${effectiveDepth.toFixed(0)}mm`,
    bsReference: 'BS8110 Cl. 3.4.4.1'
  });

  // STEP 7: Design Moment
  const momentCoeffs = getMomentCoefficient(input.endSupport);
  const designMoment = momentCoeffs.positive * ultimateLoad * Math.pow(effectiveSpan, 2);
  const negativeMoment = momentCoeffs.negative * ultimateLoad * Math.pow(effectiveSpan, 2);

  steps.push({
    title: "Step 7: Design Moments",
    formula: "M = β × n × L²",
    substitution: `M⁺ = ${momentCoeffs.positive} × ${ultimateLoad.toFixed(2)} × ${effectiveSpan.toFixed(3)}²
${negativeMoment > 0 ? `M⁻ = ${momentCoeffs.negative} × ${ultimateLoad.toFixed(2)} × ${effectiveSpan.toFixed(3)}²` : ''}`,
    result: `M⁺ (mid-span) = ${designMoment.toFixed(2)} kNm/m
${negativeMoment > 0 ? `M⁻ (support) = ${negativeMoment.toFixed(2)} kNm/m` : 'No hogging moment (simply supported)'}`,
    bsReference: 'BS8110 Table 3.10'
  });

  // STEP 8: K-value Check
  const M_Nmm = designMoment * 1e6;
  const kValue = M_Nmm / (1000 * Math.pow(effectiveDepth, 2) * input.fcu);
  const kStatus: 'safe' | 'unsafe' = kValue <= K_prime ? 'safe' : 'unsafe';

  steps.push({
    title: "Step 8: K-value Check",
    formula: "K = M / (bd²fcu)",
    substitution: `K = ${designMoment.toFixed(2)} × 10⁶ / (1000 × ${effectiveDepth.toFixed(0)}² × ${input.fcu})`,
    result: `K = ${kValue.toFixed(4)}`,
    isCheck: true,
    checkPassed: kStatus === 'safe',
    status: kStatus,
    explanation: kStatus === 'safe' 
      ? `K = ${kValue.toFixed(4)} < K' = ${K_prime} → Singly reinforced ✓`
      : `K = ${kValue.toFixed(4)} > K' = ${K_prime} → Increase waist thickness`,
    bsReference: 'BS8110 Cl. 3.4.4.4'
  });

  if (kStatus === 'unsafe') {
    failureReasons.push(`K value (${kValue.toFixed(4)}) exceeds K' (${K_prime}) - section inadequate`);
  }

  // STEP 9: Lever Arm
  const leverArm = Math.min(effectiveDepth * (0.5 + Math.sqrt(0.25 - kValue / 0.9)), 0.95 * effectiveDepth);

  steps.push({
    title: "Step 9: Lever Arm",
    formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
    substitution: `z = ${effectiveDepth.toFixed(0)} × (0.5 + √(0.25 - ${kValue.toFixed(4)}/0.9))`,
    result: `z = ${leverArm.toFixed(1)}mm`,
    bsReference: 'BS8110 Cl. 3.4.4.4'
  });

  // STEP 10: Required Steel Area
  let tensionSteel = M_Nmm / (0.87 * input.fy * leverArm);
  const minSteel = 0.0013 * 1000 * input.waistThickness;
  const distributionSteel = 0.0013 * 1000 * input.waistThickness; // Same minimum

  steps.push({
    title: "Step 10: Required Tension Steel",
    formula: "As = M / (0.87fy × z)",
    substitution: `As = ${designMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${leverArm.toFixed(1)})`,
    result: `As = ${tensionSteel.toFixed(0)} mm²/m`,
    bsReference: 'BS8110 Cl. 3.4.4.4'
  });

  // STEP 11: Minimum Steel Check
  const steelOK = tensionSteel >= minSteel;

  steps.push({
    title: "Step 11: Minimum Steel Check",
    formula: "As,min = 0.13%bh",
    substitution: `As,min = 0.0013 × 1000 × ${input.waistThickness}`,
    result: `As,min = ${minSteel.toFixed(0)} mm²/m`,
    isCheck: true,
    checkPassed: steelOK,
    status: steelOK ? 'safe' : 'review',
    explanation: steelOK 
      ? `As = ${tensionSteel.toFixed(0)} > As,min ✓`
      : `Use As,min = ${minSteel.toFixed(0)} mm²/m`,
    bsReference: 'BS8110 Cl. 3.12.5.3'
  });

  tensionSteel = Math.max(tensionSteel, minSteel);

  // STEP 12: Shear Check
  const shearCoeff = input.endSupport === 'simply-supported' ? 0.5 : 0.6;
  const shearForce = shearCoeff * ultimateLoad * effectiveSpan;
  const shearStress = (shearForce * 1000) / (1000 * effectiveDepth);
  const permissibleShear = calculateVc(tensionSteel, 1000, effectiveDepth, input.fcu);
  const shearStatus: 'safe' | 'unsafe' = shearStress <= permissibleShear ? 'safe' : 'unsafe';

  steps.push({
    title: "Step 12: Shear Check",
    formula: "V = β × n × L,  v = V / (bd)",
    substitution: `V = ${shearCoeff} × ${ultimateLoad.toFixed(2)} × ${effectiveSpan.toFixed(3)} = ${shearForce.toFixed(2)} kN
v = ${(shearForce * 1000).toFixed(0)} / (1000 × ${effectiveDepth.toFixed(0)})`,
    result: `v = ${shearStress.toFixed(3)} N/mm²
vc = ${permissibleShear.toFixed(3)} N/mm²`,
    isCheck: true,
    checkPassed: shearStatus === 'safe',
    status: shearStatus,
    explanation: shearStatus === 'safe' 
      ? `v < vc → Shear capacity adequate ✓` 
      : `v > vc → Increase waist thickness`,
    bsReference: 'BS8110 Cl. 3.4.5'
  });

  if (shearStatus === 'unsafe') {
    failureReasons.push(`Shear stress (${shearStress.toFixed(3)} N/mm²) exceeds vc (${permissibleShear.toFixed(3)} N/mm²)`);
  }

  // STEP 13: Deflection Check
  const basicRatio = getBasicSpanDepthRatio(input.endSupport);
  const tensionMod = getTensionModificationFactor(designMoment * 1e6, 1000, effectiveDepth, input.fy);
  const allowableRatio = basicRatio * tensionMod;
  const actualRatio = (effectiveSpan * 1000) / effectiveDepth;
  const deflectionStatus: 'safe' | 'unsafe' = actualRatio <= allowableRatio ? 'safe' : 'unsafe';

  steps.push({
    title: "Step 13: Deflection Check",
    formula: "Actual span/d ≤ Basic ratio × Modification factor",
    substitution: `Basic span/depth ratio = ${basicRatio}
Tension modification factor = ${tensionMod.toFixed(2)}
Allowable span/d = ${basicRatio} × ${tensionMod.toFixed(2)} = ${allowableRatio.toFixed(1)}`,
    result: `Actual span/d = ${actualRatio.toFixed(1)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
    isCheck: true,
    checkPassed: deflectionStatus === 'safe',
    status: deflectionStatus,
    explanation: deflectionStatus === 'safe' 
      ? `Actual ≤ Allowable → Deflection OK ✓` 
      : `Actual > Allowable → Increase waist thickness`,
    bsReference: 'BS8110 Cl. 3.4.6'
  });

  if (deflectionStatus === 'unsafe') {
    failureReasons.push(`Deflection check failed: L/d = ${actualRatio.toFixed(1)} > ${allowableRatio.toFixed(1)}`);
  }

  // STEP 14: Reinforcement Provision
  const mainBarsResult = suggestBars(tensionSteel, input.fy);
  const distBarsResult = suggestBars(distributionSteel, input.fy);

  steps.push({
    title: "Step 14: Reinforcement Provision",
    result: `Main Steel (along span): ${mainBarsResult.suggestion}
Distribution Steel (transverse): ${distBarsResult.suggestion}`,
    explanation: "Main bars placed as bottom layer along the span direction"
  });

  // STEP 15: Final Summary
  const designValid = kStatus === 'safe' && shearStatus === 'safe' && deflectionStatus === 'safe';
  const statusEmoji = designValid ? '✅' : '❌';
  const statusText = designValid ? 'DESIGN ADEQUATE' : 'DESIGN INADEQUATE';

  steps.push({
    title: "FINAL DESIGN SUMMARY",
    result: `${statusEmoji} ${statusText}

Staircase: ${input.staircaseId}
Waist Thickness: ${input.waistThickness}mm
Effective Depth: ${effectiveDepth.toFixed(0)}mm
Effective Span: ${effectiveSpan.toFixed(3)}m

Design Load: ${ultimateLoad.toFixed(2)} kN/m²
Design Moment: ${designMoment.toFixed(2)} kNm/m

REINFORCEMENT:
Main Steel: ${mainBarsResult.suggestion}
Distribution: ${distBarsResult.suggestion}

CHECKS:
K-value: ${kValue.toFixed(4)} ${kStatus === 'safe' ? '✓' : '✗'}
Shear: ${shearStress.toFixed(3)}/${permissibleShear.toFixed(3)} ${shearStatus === 'safe' ? '✓' : '✗'}
Deflection: ${actualRatio.toFixed(1)}/${allowableRatio.toFixed(1)} ${deflectionStatus === 'safe' ? '✓' : '✗'}`,
    status: designValid ? 'safe' : 'unsafe',
    bsReference: 'BS8110-1:1997'
  });

  return {
    steps,
    summary: {
      staircaseId: input.staircaseId,
      staircaseType: typeLabels[input.staircaseType],
      waistType: waistLabels[input.waistType],
      endSupport: supportLabels[input.endSupport],
      spanLength: input.spanLength,
      riserHeight: input.riserHeight,
      goingLength: input.goingLength,
      numberOfRisers: input.numberOfRisers,
      waistThickness: input.waistThickness,
      stairWidth: input.stairWidth,
      fcu: input.fcu,
      fy: input.fy,
      cover: input.cover,
      effectiveSpan,
      slopeAngle,
      selfWeight: totalSelfWeight,
      ultimateLoad,
      effectiveDepth,
      designMoment,
      kValue,
      kPrime: K_prime,
      leverArm,
      tensionSteel,
      distributionSteel,
      minSteel,
      barSuggestion: mainBarsResult.suggestion,
      distBarSuggestion: distBarsResult.suggestion,
      shearForce,
      shearStress,
      permissibleShear,
      basicSpanDepthRatio: basicRatio,
      tensionModFactor: tensionMod,
      allowableSpanDepth: allowableRatio,
      actualSpanDepth: actualRatio,
      kStatus,
      shearStatus,
      deflectionStatus,
      designValid,
      failureReasons
    }
  };
}
