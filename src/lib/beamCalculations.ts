export interface BeamInput {
  span: number; // m
  deadLoad: number; // kN/m
  liveLoad: number; // kN/m
  fcu: number; // N/mm²
  fy: number; // N/mm²
  width: number; // mm
  overallDepth: number; // mm (h)
  cover: number; // mm
  linkDiameter: number; // mm (typically 8, 10, or 12)
  mainBarDiameter: number; // mm (typically 16, 20, 25, 32)
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

export interface BeamResult {
  steps: CalculationStep[];
  summary: {
    // Input values for display
    span: number;
    width: number;
    overallDepth: number;
    fcu: number;
    fy: number;
    deadLoad: number;
    liveLoad: number;
    cover: number;
    // Calculated values
    effectiveDepth: number;
    ultimateLoad: number;
    ultimateMoment: number;
    shearForce: number;
    criticalShear: number;
    kValue: number;
    kPrime: number;
    leverArm: number;
    tensionSteel: number;
    compressionSteel: number;
    minSteel: number;
    shearStress: number;
    vc: number;
    maxShearStress: number;
    // Deflection values
    basicSpanDepthRatio: number;
    tensionModificationFactor: number;
    compressionModificationFactor: number;
    allowableSpanDepthRatio: number;
    actualSpanDepthRatio: number;
    // Status values
    isDoublyReinforced: boolean;
    designValid: boolean;
    deflectionStatus: 'safe' | 'unsafe';
    shearStatus: 'safe' | 'unsafe';
    kCheckStatus: 'safe' | 'unsafe';
    // Reinforcement
    linkSize: number;
    linkSpacing: number;
    barSuggestion: string;
    compressionBarSuggestion?: string;
    // Failure tracking
    failureReasons: string[];
  };
}

// BS8110 Table 3.9 - Basic span/effective depth ratios
function getBasicSpanDepthRatio(supportCondition: string): number {
  switch (supportCondition) {
    case 'cantilever': return 7;
    case 'simply-supported': return 20;
    case 'continuous': return 26;
    default: return 20;
  }
}

// Calculate tension reinforcement modification factor (BS8110 Cl. 3.4.6.5)
function getTensionModificationFactor(M: number, b: number, d: number, As: number, fy: number): number {
  const fs = (2 * fy * As) / (3 * b * d); // Service stress (approximate)
  const Mu = M / (b * d * d);
  const factor = 0.55 + (477 - fs) / (120 * (0.9 + Mu));
  return Math.min(Math.max(factor, 0.55), 2.0);
}

// Calculate compression modification factor (BS8110 Cl. 3.4.6.6)
function getCompressionModificationFactor(As_prov: number, As_req: number): number {
  const ratio = As_prov / As_req;
  return Math.min(1 + ratio / 3, 1.5);
}

// Calculate permissible shear stress vc (BS8110 Table 3.8)
function calculateVc(As: number, b: number, d: number, fcu: number): number {
  const ratio = Math.min((100 * As) / (b * d), 3);
  const depthFactor = Math.pow(400 / d, 0.25);
  const fcuFactor = Math.pow(fcu / 25, 1/3);
  return (0.79 * Math.pow(ratio, 1/3) * Math.max(depthFactor, 0.67) * Math.min(fcuFactor, 1.0)) / 1.25;
}

// Calculate link spacing requirements (BS8110 Cl. 3.4.5.5)
function calculateLinkSpacing(v: number, vc: number, b: number, d: number, fy: number): { size: number; spacing: number } {
  const vShear = v - vc;
  if (vShear <= 0) {
    return { size: 8, spacing: 300 }; // Nominal links
  }
  
  // Asv/sv = bv(v - vc) / (0.87fyv)
  const AsvOverSv = (b * vShear) / (0.87 * fy);
  
  // Try different link sizes
  const linkSizes = [8, 10, 12];
  for (const dia of linkSizes) {
    const Asv = 2 * Math.PI * Math.pow(dia / 2, 2); // 2-leg links
    const spacing = Math.floor(Asv / AsvOverSv);
    if (spacing >= 75 && spacing <= 0.75 * d) {
      return { size: dia, spacing: Math.min(spacing, Math.floor(0.75 * d)) };
    }
  }
  
  return { size: 12, spacing: 100 }; // Fallback
}

// Suggest bar configuration
function suggestBars(area: number): string {
  const options = [
    { dia: 12, area: 113 },
    { dia: 16, area: 201 },
    { dia: 20, area: 314 },
    { dia: 25, area: 491 },
    { dia: 32, area: 804 }
  ];
  
  for (const bar of options) {
    const count = Math.ceil(area / bar.area);
    if (count <= 4) {
      return `${count}T${bar.dia} (${(count * bar.area).toFixed(0)} mm² provided)`;
    }
  }
  return "Use 2 layers or larger bars";
}

export function calculateBeamDesign(input: BeamInput): BeamResult {
  const steps: CalculationStep[] = [];
  const failureReasons: string[] = [];
  const gamma_dead = 1.4;
  const gamma_live = 1.6;
  const concreteWeight = 25; // kN/m³
  const kPrime = 0.156;

  // STEP 0: Beam Declaration
  steps.push({
    title: "BEAM DECLARATION",
    result: `Beam Type: Simply Supported Rectangular Beam
Section: ${input.width}mm × ${input.overallDepth}mm
Span: ${input.span}m
Concrete: C${input.fcu} (fcu = ${input.fcu} N/mm²)
Steel: Grade ${input.fy} (fy = ${input.fy} N/mm²)
Cover: ${input.cover}mm
Main Bars: T${input.mainBarDiameter}
Links: T${input.linkDiameter}`,
    explanation: "Design in accordance with BS 8110-1:1997",
    bsReference: 'BS8110 Cl. 3.4',
    status: 'safe'
  });
  
  // STEP 1: Self-Weight Calculation
  const selfWeight = (input.width / 1000) * (input.overallDepth / 1000) * concreteWeight;
  
  steps.push({
    title: "Step 1: Self-Weight Calculation",
    formula: "Self-weight = b × h × γc",
    substitution: `Self-weight = (${input.width}/1000) × (${input.overallDepth}/1000) × ${concreteWeight}`,
    result: `Self-weight = ${selfWeight.toFixed(2)} kN/m`,
    explanation: "Concrete density γc = 25 kN/m³",
    bsReference: 'BS8110 Cl. 2.4.2'
  });

  // STEP 2: Effective Depth Calculation
  const effectiveDepth = input.overallDepth - input.cover - input.linkDiameter - input.mainBarDiameter / 2;
  
  steps.push({
    title: "Step 2: Effective Depth Calculation",
    formula: "d = h - cover - φlink - φbar/2",
    substitution: `d = ${input.overallDepth} - ${input.cover} - ${input.linkDiameter} - ${input.mainBarDiameter}/2`,
    result: `d = ${effectiveDepth.toFixed(0)} mm`,
    explanation: "Distance from compression face to centroid of tension reinforcement",
    bsReference: "BS8110 Cl. 3.4.4.1"
  });

  // STEP 3: Load Calculation
  const totalDeadLoad = input.deadLoad + selfWeight;
  const ultimateLoad = gamma_dead * totalDeadLoad + gamma_live * input.liveLoad;
  
  steps.push({
    title: "Step 3: Ultimate Design Load",
    formula: "w = 1.4(Gk + SW) + 1.6Qk",
    substitution: `Gk = ${input.deadLoad} kN/m (imposed dead)
SW = ${selfWeight.toFixed(2)} kN/m (self-weight)
Total Gk = ${input.deadLoad} + ${selfWeight.toFixed(2)} = ${totalDeadLoad.toFixed(2)} kN/m
Qk = ${input.liveLoad} kN/m

w = 1.4 × ${totalDeadLoad.toFixed(2)} + 1.6 × ${input.liveLoad}
w = ${(gamma_dead * totalDeadLoad).toFixed(2)} + ${(gamma_live * input.liveLoad).toFixed(2)}`,
    result: `w = ${ultimateLoad.toFixed(2)} kN/m`,
    explanation: "Partial safety factors: γf = 1.4 for dead loads, γf = 1.6 for live loads",
    bsReference: "BS8110 Cl. 2.4.3"
  });

  // STEP 4: Ultimate Moment
  const ultimateMoment = (ultimateLoad * Math.pow(input.span, 2)) / 8;
  
  steps.push({
    title: "Step 4: Ultimate Bending Moment",
    formula: "M = wL²/8 (simply supported beam with UDL)",
    substitution: `M = ${ultimateLoad.toFixed(2)} × ${input.span}² / 8
M = ${ultimateLoad.toFixed(2)} × ${Math.pow(input.span, 2).toFixed(2)} / 8`,
    result: `M = ${ultimateMoment.toFixed(2)} kN·m`,
    explanation: "Maximum moment occurs at mid-span for simply supported beam with uniformly distributed load",
    bsReference: "BS8110 Cl. 3.4.4"
  });

  // STEP 5: K Value
  const M_Nmm = ultimateMoment * 1e6;
  const kValue = M_Nmm / (input.width * Math.pow(effectiveDepth, 2) * input.fcu);
  
  steps.push({
    title: "Step 5: K-Value Calculation",
    formula: "K = M / (bd²fcu)",
    substitution: `K = ${ultimateMoment.toFixed(2)} × 10⁶ / (${input.width} × ${effectiveDepth.toFixed(0)}² × ${input.fcu})
K = ${(ultimateMoment * 1e6).toFixed(0)} / (${input.width} × ${Math.pow(effectiveDepth, 2).toFixed(0)} × ${input.fcu})
K = ${(ultimateMoment * 1e6).toFixed(0)} / ${(input.width * Math.pow(effectiveDepth, 2) * input.fcu).toFixed(0)}`,
    result: `K = ${kValue.toFixed(4)}`,
    explanation: "Dimensionless parameter to determine if section is singly or doubly reinforced",
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // STEP 6: Check K vs K'
  const isDoublyReinforced = kValue > kPrime;
  const kCheckStatus: 'safe' | 'unsafe' = kValue <= 0.225 ? 'safe' : 'unsafe';
  
  steps.push({
    title: "Step 6: Section Classification",
    formula: "Compare K with K' = 0.156",
    substitution: `K = ${kValue.toFixed(4)}
K' = 0.156 (limiting value for singly reinforced section)`,
    result: `K = ${kValue.toFixed(4)} ${kValue <= kPrime ? "≤" : ">"} K' = 0.156
${isDoublyReinforced ? "DOUBLY REINFORCED BEAM Required" : "SINGLY REINFORCED BEAM"}`,
    isCheck: true,
    checkPassed: !isDoublyReinforced,
    status: isDoublyReinforced ? 'review' : 'safe',
    explanation: isDoublyReinforced 
      ? "K > K': Compression reinforcement needed to resist excess moment"
      : "K ≤ K': Section adequate for singly reinforced design",
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  if (kValue > 0.225) {
    failureReasons.push("K value exceeds maximum limit (0.225) - section is inadequate, increase depth");
  }

  // STEP 7: Lever Arm
  const kForZ = isDoublyReinforced ? kPrime : kValue;
  const leverArmRatio = 0.5 + Math.sqrt(0.25 - kForZ / 0.9);
  const leverArm = Math.min(leverArmRatio, 0.95) * effectiveDepth;
  
  steps.push({
    title: "Step 7: Lever Arm Calculation",
    formula: "z = d[0.5 + √(0.25 - K/0.9)] ≤ 0.95d",
    substitution: `Using K${isDoublyReinforced ? "'" : ""} = ${kForZ.toFixed(4)}:
z/d = 0.5 + √(0.25 - ${kForZ.toFixed(4)}/0.9)
z/d = 0.5 + √(0.25 - ${(kForZ/0.9).toFixed(4)})
z/d = 0.5 + √${(0.25 - kForZ/0.9).toFixed(4)}
z/d = 0.5 + ${Math.sqrt(0.25 - kForZ/0.9).toFixed(4)} = ${leverArmRatio.toFixed(4)}

z = ${Math.min(leverArmRatio, 0.95).toFixed(4)} × ${effectiveDepth.toFixed(0)}`,
    result: `z = ${leverArm.toFixed(1)} mm`,
    explanation: `Lever arm ratio = ${leverArmRatio.toFixed(4)}, limited to 0.95d = ${(0.95 * effectiveDepth).toFixed(0)} mm maximum`,
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // STEP 8: Steel Area Calculation
  let tensionSteel: number;
  let compressionSteel = 0;
  let compressionBarSuggestion: string | undefined;
  
  if (isDoublyReinforced) {
    const MLimit = kPrime * input.width * Math.pow(effectiveDepth, 2) * input.fcu;
    const excessMoment = M_Nmm - MLimit;
    const dPrime = input.cover + input.linkDiameter + input.mainBarDiameter / 2;
    
    compressionSteel = excessMoment / (0.87 * input.fy * (effectiveDepth - dPrime));
    tensionSteel = (MLimit / (0.87 * input.fy * leverArm)) + compressionSteel;
    compressionBarSuggestion = suggestBars(compressionSteel);
    
    steps.push({
      title: "Step 8a: Limiting Moment",
      formula: "M' = K'bd²fcu",
      substitution: `M' = 0.156 × ${input.width} × ${effectiveDepth.toFixed(0)}² × ${input.fcu}
M' = 0.156 × ${input.width} × ${Math.pow(effectiveDepth, 2).toFixed(0)} × ${input.fcu}`,
      result: `M' = ${(MLimit/1e6).toFixed(2)} kN·m`,
      explanation: "Maximum moment that can be resisted by singly reinforced section",
      bsReference: "BS8110 Cl. 3.4.4.4"
    });
    
    steps.push({
      title: "Step 8b: Compression Steel Area",
      formula: "As' = (M - M') / [0.87fy(d - d')]",
      substitution: `d' = ${input.cover} + ${input.linkDiameter} + ${input.mainBarDiameter}/2 = ${dPrime.toFixed(0)} mm
M - M' = ${ultimateMoment.toFixed(2)} - ${(MLimit/1e6).toFixed(2)} = ${((M_Nmm - MLimit)/1e6).toFixed(2)} kN·m

As' = ${((M_Nmm - MLimit)/1e6).toFixed(2)} × 10⁶ / [0.87 × ${input.fy} × (${effectiveDepth.toFixed(0)} - ${dPrime.toFixed(0)})]
As' = ${(excessMoment).toFixed(0)} / [${(0.87 * input.fy).toFixed(0)} × ${(effectiveDepth - dPrime).toFixed(0)}]`,
      result: `As' = ${compressionSteel.toFixed(0)} mm²`,
      bsReference: "BS8110 Cl. 3.4.4.4"
    });
    
    steps.push({
      title: "Step 8c: Tension Steel Area",
      formula: "As = M'/(0.87fy·z) + As'",
      substitution: `As = ${(MLimit/1e6).toFixed(2)} × 10⁶/(0.87 × ${input.fy} × ${leverArm.toFixed(1)}) + ${compressionSteel.toFixed(0)}
As = ${(MLimit / (0.87 * input.fy * leverArm)).toFixed(0)} + ${compressionSteel.toFixed(0)}`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`,
      bsReference: "BS8110 Cl. 3.4.4.4"
    });
  } else {
    tensionSteel = M_Nmm / (0.87 * input.fy * leverArm);
    
    steps.push({
      title: "Step 8: Tension Steel Area",
      formula: "As = M / (0.87fy·z)",
      substitution: `As = ${ultimateMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${leverArm.toFixed(1)})
As = ${(ultimateMoment * 1e6).toFixed(0)} / (${(0.87 * input.fy).toFixed(0)} × ${leverArm.toFixed(1)})
As = ${(ultimateMoment * 1e6).toFixed(0)} / ${(0.87 * input.fy * leverArm).toFixed(0)}`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`,
      explanation: "Required area of tension reinforcement",
      bsReference: "BS8110 Cl. 3.4.4.4"
    });
  }

  // STEP 9: Minimum Steel Check
  const minSteel = 0.0013 * input.width * effectiveDepth;
  const steelOK = tensionSteel >= minSteel;
  
  steps.push({
    title: "Step 9: Minimum Steel Check",
    formula: "As,min = 0.13%bh ≈ 0.13%bd",
    substitution: `As,min = 0.0013 × ${input.width} × ${effectiveDepth.toFixed(0)}
As,min = ${(0.0013 * input.width * effectiveDepth).toFixed(0)}`,
    result: `As,min = ${minSteel.toFixed(0)} mm²`,
    isCheck: true,
    checkPassed: steelOK,
    status: steelOK ? 'safe' : 'review',
    explanation: steelOK 
      ? `As = ${tensionSteel.toFixed(0)} mm² > As,min = ${minSteel.toFixed(0)} mm² ✓`
      : `As = ${tensionSteel.toFixed(0)} mm² < As,min = ${minSteel.toFixed(0)} mm² - Use minimum steel`,
    bsReference: "BS8110 Cl. 3.12.5.3"
  });

  const finalTensionSteel = Math.max(tensionSteel, minSteel);
  const barSuggestion = suggestBars(finalTensionSteel);

  // STEP 10: Reinforcement Selection
  steps.push({
    title: "Step 10: Reinforcement Selection",
    result: `Required Steel: As = ${finalTensionSteel.toFixed(0)} mm²
Provide: ${barSuggestion}${compressionSteel > 0 ? `

Compression Steel: As' = ${compressionSteel.toFixed(0)} mm²
Provide: ${compressionBarSuggestion}` : ''}`,
    explanation: "Select bars to provide area ≥ As required, considering practical spacing",
    bsReference: "BS8110 Cl. 3.12"
  });

  // STEP 11: Shear Force
  const shearForce = (ultimateLoad * input.span) / 2;
  
  steps.push({
    title: "Step 11: Maximum Shear Force",
    formula: "V = wL/2 (at support for simply supported beam)",
    substitution: `V = ${ultimateLoad.toFixed(2)} × ${input.span} / 2
V = ${(ultimateLoad * input.span).toFixed(2)} / 2`,
    result: `V = ${shearForce.toFixed(2)} kN`,
    bsReference: "BS8110 Cl. 3.4.5"
  });

  // STEP 12: Critical Section Shear (at d from support)
  const criticalShear = shearForce - (ultimateLoad * effectiveDepth / 1000);
  
  steps.push({
    title: "Step 12: Critical Section Shear (at d from support)",
    formula: "Vd = V - w × d",
    substitution: `Vd = ${shearForce.toFixed(2)} - ${ultimateLoad.toFixed(2)} × ${effectiveDepth.toFixed(0)}/1000
Vd = ${shearForce.toFixed(2)} - ${(ultimateLoad * effectiveDepth / 1000).toFixed(2)}`,
    result: `Vd = ${criticalShear.toFixed(2)} kN`,
    explanation: "Critical section for shear is taken at effective depth d from face of support",
    bsReference: "BS8110 Cl. 3.4.5.2"
  });

  // STEP 13: Shear Stress
  const shearStress = (criticalShear * 1000) / (input.width * effectiveDepth);
  const vc = calculateVc(finalTensionSteel, input.width, effectiveDepth, input.fcu);
  const maxShearStress = Math.min(0.8 * Math.sqrt(input.fcu), 5);
  
  steps.push({
    title: "Step 13: Shear Stress Check",
    formula: "v = V / (bd)",
    substitution: `v = ${(criticalShear * 1000).toFixed(0)} / (${input.width} × ${effectiveDepth.toFixed(0)})
v = ${(criticalShear * 1000).toFixed(0)} / ${(input.width * effectiveDepth).toFixed(0)}`,
    result: `v = ${shearStress.toFixed(3)} N/mm²

Permissible shear stress:
vc = ${vc.toFixed(3)} N/mm² (from Table 3.8)
vmax = 0.8√fcu = 0.8 × √${input.fcu} = ${maxShearStress.toFixed(2)} N/mm²`,
    isCheck: true,
    checkPassed: shearStress < maxShearStress,
    status: shearStress < maxShearStress ? (shearStress <= vc ? 'safe' : 'review') : 'unsafe',
    explanation: shearStress < maxShearStress 
      ? (shearStress <= vc ? `v < vc → Nominal links required ✓` : `v > vc → Design shear links`)
      : `v > vmax → Section inadequate - increase dimensions`,
    bsReference: "BS8110 Cl. 3.4.5"
  });

  const shearStatus: 'safe' | 'unsafe' = shearStress < maxShearStress ? 'safe' : 'unsafe';
  
  if (shearStatus === 'unsafe') {
    failureReasons.push(`Shear stress (${shearStress.toFixed(2)} N/mm²) exceeds maximum (${maxShearStress.toFixed(2)} N/mm²)`);
  }

  // STEP 14: Shear Reinforcement Design
  let linkSize = input.linkDiameter;
  let linkSpacing = 300;
  
  if (shearStress > vc) {
    const links = calculateLinkSpacing(shearStress, vc, input.width, effectiveDepth, input.fy);
    linkSize = links.size;
    linkSpacing = links.spacing;
    
    const vShear = shearStress - vc;
    const AsvOverSv = (input.width * vShear) / (0.87 * input.fy);
    
    steps.push({
      title: "Step 14: Shear Link Design",
      formula: "Asv/sv = b(v - vc) / (0.87fyv)",
      substitution: `v - vc = ${shearStress.toFixed(3)} - ${vc.toFixed(3)} = ${vShear.toFixed(3)} N/mm²
Asv/sv = ${input.width} × ${vShear.toFixed(3)} / (0.87 × ${input.fy})
Asv/sv = ${(input.width * vShear).toFixed(2)} / ${(0.87 * input.fy).toFixed(0)}
Asv/sv = ${AsvOverSv.toFixed(3)} mm²/mm

For T${linkSize} 2-leg links:
Asv = 2 × π × (${linkSize}/2)² = ${(2 * Math.PI * Math.pow(linkSize/2, 2)).toFixed(0)} mm²
sv = ${(2 * Math.PI * Math.pow(linkSize/2, 2)).toFixed(0)} / ${AsvOverSv.toFixed(3)} = ${((2 * Math.PI * Math.pow(linkSize/2, 2)) / AsvOverSv).toFixed(0)} mm`,
      result: `Provide T${linkSize} links @ ${linkSpacing}mm c/c`,
      explanation: `Maximum spacing = 0.75d = ${(0.75 * effectiveDepth).toFixed(0)} mm`,
      bsReference: "BS8110 Cl. 3.4.5.5"
    });
  } else {
    steps.push({
      title: "Step 14: Shear Link Design",
      formula: "v ≤ vc → Nominal links only required",
      substitution: `v = ${shearStress.toFixed(3)} N/mm² ≤ vc = ${vc.toFixed(3)} N/mm²`,
      result: `Provide T${linkSize} links @ ${linkSpacing}mm c/c (nominal)`,
      status: 'safe',
      explanation: "Minimum links required for containment and crack control",
      bsReference: "BS8110 Cl. 3.4.5.3"
    });
  }

  // STEP 15: Deflection Check
  const basicRatio = getBasicSpanDepthRatio('simply-supported');
  const tensionMod = getTensionModificationFactor(M_Nmm, input.width, effectiveDepth, finalTensionSteel, input.fy);
  const compMod = isDoublyReinforced ? getCompressionModificationFactor(compressionSteel, compressionSteel * 0.9) : 1.0;
  const allowableRatio = basicRatio * tensionMod * compMod;
  const actualRatio = (input.span * 1000) / effectiveDepth;
  const deflectionOK = actualRatio <= allowableRatio;
  
  steps.push({
    title: "Step 15: Deflection Check (Span/Depth Ratio)",
    formula: "Actual L/d ≤ Basic ratio × Modification factors",
    substitution: `Basic span/depth ratio (Table 3.9):
For simply supported beam: ${basicRatio}

Tension reinforcement modification factor (Cl. 3.4.6.5):
fs = 2fyAs / (3bd) ≈ service stress
Factor = 0.55 + (477 - fs) / 120(0.9 + M/bd²)
Tension factor = ${tensionMod.toFixed(3)}
${isDoublyReinforced ? `
Compression modification factor (Cl. 3.4.6.6):
Factor = 1 + As'prov/(3As'req) ≤ 1.5
Compression factor = ${compMod.toFixed(3)}
` : ''}
Allowable L/d = ${basicRatio} × ${tensionMod.toFixed(3)}${isDoublyReinforced ? ` × ${compMod.toFixed(3)}` : ''} = ${allowableRatio.toFixed(1)}

Actual L/d = ${(input.span * 1000).toFixed(0)} / ${effectiveDepth.toFixed(0)} = ${actualRatio.toFixed(1)}`,
    result: `Actual L/d = ${actualRatio.toFixed(1)}
Allowable L/d = ${allowableRatio.toFixed(1)}`,
    isCheck: true,
    checkPassed: deflectionOK,
    status: deflectionOK ? 'safe' : 'unsafe',
    explanation: deflectionOK 
      ? `Actual L/d ≤ Allowable L/d → Deflection satisfactory ✓` 
      : `Actual L/d > Allowable L/d → Increase depth or add compression steel`,
    bsReference: "BS8110 Cl. 3.4.6"
  });

  const deflectionStatus: 'safe' | 'unsafe' = deflectionOK ? 'safe' : 'unsafe';
  
  if (!deflectionOK) {
    failureReasons.push(`Deflection check failed: L/d = ${actualRatio.toFixed(1)} > ${allowableRatio.toFixed(1)}`);
  }

  // STEP 16: Final Summary
  const designValid = kCheckStatus === 'safe' && shearStatus === 'safe' && deflectionStatus === 'safe';
  const statusEmoji = designValid ? '✅' : '❌';
  const statusText = designValid ? 'DESIGN ADEQUATE' : 'DESIGN INADEQUATE';

  steps.push({
    title: "FINAL DESIGN SUMMARY",
    result: `${statusEmoji} ${statusText}

BEAM SPECIFICATION:
Section: ${input.width}mm × ${input.overallDepth}mm
Span: ${input.span}m
Effective Depth: ${effectiveDepth.toFixed(0)}mm

LOADING:
Ultimate Load: ${ultimateLoad.toFixed(2)} kN/m
Design Moment: ${ultimateMoment.toFixed(2)} kNm
Design Shear: ${criticalShear.toFixed(2)} kN

REINFORCEMENT:
Tension: ${barSuggestion}${compressionSteel > 0 ? `
Compression: ${compressionBarSuggestion}` : ''}
Shear Links: T${linkSize}@${linkSpacing}mm c/c

DESIGN CHECKS:
K-value: ${kValue.toFixed(4)} ${kCheckStatus === 'safe' ? '✓' : '✗'}
Shear: ${shearStress.toFixed(3)}/${vc.toFixed(3)} N/mm² ${shearStatus === 'safe' ? '✓' : '✗'}
Deflection: L/d = ${actualRatio.toFixed(1)}/${allowableRatio.toFixed(1)} ${deflectionStatus === 'safe' ? '✓' : '✗'}`,
    status: designValid ? 'safe' : 'unsafe',
    bsReference: 'BS8110-1:1997'
  });

  return {
    steps,
    summary: {
      // Input values
      span: input.span,
      width: input.width,
      overallDepth: input.overallDepth,
      fcu: input.fcu,
      fy: input.fy,
      deadLoad: input.deadLoad,
      liveLoad: input.liveLoad,
      cover: input.cover,
      // Calculated values
      effectiveDepth,
      ultimateLoad,
      ultimateMoment,
      shearForce,
      criticalShear,
      kValue,
      kPrime,
      leverArm,
      tensionSteel: finalTensionSteel,
      compressionSteel,
      minSteel,
      shearStress,
      vc,
      maxShearStress,
      // Deflection values
      basicSpanDepthRatio: basicRatio,
      tensionModificationFactor: tensionMod,
      compressionModificationFactor: compMod,
      allowableSpanDepthRatio: allowableRatio,
      actualSpanDepthRatio: actualRatio,
      // Status values
      isDoublyReinforced,
      designValid,
      deflectionStatus,
      shearStatus,
      kCheckStatus,
      // Reinforcement
      linkSize,
      linkSpacing,
      barSuggestion,
      compressionBarSuggestion,
      // Failures
      failureReasons
    }
  };
}
