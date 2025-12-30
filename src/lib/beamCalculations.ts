export interface BeamInput {
  span: number; // m
  deadLoad: number; // kN/m
  liveLoad: number; // kN/m
  fcu: number; // N/mm²
  fy: number; // N/mm²
  width: number; // mm
  effectiveDepth: number; // mm
  cover: number; // mm
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
    ultimateMoment: number;
    kValue: number;
    leverArm: number;
    tensionSteel: number;
    compressionSteel: number;
    shearForce: number;
    shearStress: number;
    minSteel: number;
    isDoublyReinforced: boolean;
    designValid: boolean;
    deflectionStatus?: 'safe' | 'unsafe';
    shearStatus?: 'safe' | 'unsafe';
    linkSize?: number;
    linkSpacing?: number;
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

export function calculateBeamDesign(input: BeamInput): BeamResult {
  const steps: CalculationStep[] = [];
  
  // Step 1: Load Calculation
  const ultimateLoad = 1.4 * input.deadLoad + 1.6 * input.liveLoad;
  steps.push({
    title: "Step 1: Ultimate Design Load",
    formula: "w = 1.4Gk + 1.6Qk",
    substitution: `w = 1.4 × ${input.deadLoad} + 1.6 × ${input.liveLoad}`,
    result: `w = ${ultimateLoad.toFixed(2)} kN/m`,
    explanation: "Applying partial safety factors for dead (1.4) and live (1.6) loads",
    bsReference: "BS8110 Cl. 2.4.3"
  });

  // Step 2: Ultimate Moment
  const ultimateMoment = (ultimateLoad * Math.pow(input.span, 2)) / 8;
  steps.push({
    title: "Step 2: Ultimate Bending Moment",
    formula: "M = wL²/8 (for simply supported beam with UDL)",
    substitution: `M = ${ultimateLoad.toFixed(2)} × ${input.span}² / 8`,
    result: `M = ${ultimateMoment.toFixed(2)} kN·m`,
    explanation: "Maximum moment at mid-span for simply supported beam"
  });

  // Step 3: K Value
  const M_Nmm = ultimateMoment * 1e6;
  const kValue = M_Nmm / (input.width * Math.pow(input.effectiveDepth, 2) * input.fcu);
  const kPrime = 0.156;
  
  steps.push({
    title: "Step 3: K Value",
    formula: "K = M / (bd²fcu)",
    substitution: `K = ${ultimateMoment.toFixed(2)} × 10⁶ / (${input.width} × ${input.effectiveDepth}² × ${input.fcu})`,
    result: `K = ${kValue.toFixed(4)}`,
    explanation: "Dimensionless parameter to determine beam type",
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // Step 4: Check K vs K'
  const isDoublyReinforced = kValue > kPrime;
  steps.push({
    title: "Step 4: Check Beam Type",
    formula: "Compare K with K' = 0.156",
    substitution: `K = ${kValue.toFixed(4)} ${kValue <= kPrime ? "≤" : ">"} K' = 0.156`,
    result: isDoublyReinforced ? "Doubly Reinforced Beam Required" : "Singly Reinforced Beam",
    isCheck: true,
    checkPassed: !isDoublyReinforced,
    status: isDoublyReinforced ? 'review' : 'safe',
    explanation: isDoublyReinforced 
      ? "K > K': Compression reinforcement needed to resist excess moment"
      : "K ≤ K': Section adequate for singly reinforced design"
  });

  // Step 5: Lever Arm
  const kForZ = isDoublyReinforced ? kPrime : kValue;
  const leverArmRatio = 0.5 + Math.sqrt(0.25 - kForZ / 0.9);
  const leverArm = Math.min(leverArmRatio, 0.95) * input.effectiveDepth;
  
  steps.push({
    title: "Step 5: Lever Arm",
    formula: "z = d[0.5 + √(0.25 - K/0.9)]",
    substitution: `z = ${input.effectiveDepth}[0.5 + √(0.25 - ${kForZ.toFixed(4)}/0.9)]`,
    result: `z = ${leverArm.toFixed(1)} mm (z/d = ${(leverArm/input.effectiveDepth).toFixed(3)})`,
    explanation: "Lever arm limited to 0.95d maximum",
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // Step 6: Tension Steel Area
  let tensionSteel: number;
  let compressionSteel = 0;
  
  if (isDoublyReinforced) {
    const MLimit = kPrime * input.width * Math.pow(input.effectiveDepth, 2) * input.fcu;
    const excessMoment = M_Nmm - MLimit;
    const dPrime = input.cover + 10;
    
    compressionSteel = excessMoment / (0.87 * input.fy * (input.effectiveDepth - dPrime));
    tensionSteel = (MLimit / (0.87 * input.fy * leverArm)) + compressionSteel;
    
    steps.push({
      title: "Step 6a: Limiting Moment",
      formula: "M' = K'bd²fcu",
      substitution: `M' = 0.156 × ${input.width} × ${input.effectiveDepth}² × ${input.fcu}`,
      result: `M' = ${(MLimit/1e6).toFixed(2)} kN·m`
    });
    
    steps.push({
      title: "Step 6b: Compression Steel Area",
      formula: "As' = (M - M') / [0.87fy(d - d')]",
      substitution: `As' = (${ultimateMoment.toFixed(2)} - ${(MLimit/1e6).toFixed(2)}) × 10⁶ / [0.87 × ${input.fy} × (${input.effectiveDepth} - ${dPrime})]`,
      result: `As' = ${compressionSteel.toFixed(0)} mm²`
    });
    
    steps.push({
      title: "Step 6c: Tension Steel Area",
      formula: "As = M'/(0.87fy·z) + As'",
      substitution: `As = ${(MLimit/1e6).toFixed(2)} × 10⁶/(0.87 × ${input.fy} × ${leverArm.toFixed(1)}) + ${compressionSteel.toFixed(0)}`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`
    });
  } else {
    tensionSteel = M_Nmm / (0.87 * input.fy * leverArm);
    
    steps.push({
      title: "Step 6: Tension Steel Area",
      formula: "As = M / (0.87fy·z)",
      substitution: `As = ${ultimateMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${leverArm.toFixed(1)})`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`,
      explanation: "Required area of tension reinforcement",
      bsReference: "BS8110 Cl. 3.4.4.4"
    });
  }

  // Step 7: Minimum Steel Check
  const minSteel = 0.0013 * input.width * input.effectiveDepth;
  const steelOK = tensionSteel >= minSteel;
  
  steps.push({
    title: "Step 7: Minimum Steel Check",
    formula: "As,min = 0.13%bh ≈ 0.13%bd",
    substitution: `As,min = 0.0013 × ${input.width} × ${input.effectiveDepth}`,
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

  // Step 8: Shear Force
  const shearForce = (ultimateLoad * input.span) / 2;
  
  steps.push({
    title: "Step 8: Shear Force",
    formula: "V = wL/2",
    substitution: `V = ${ultimateLoad.toFixed(2)} × ${input.span} / 2`,
    result: `V = ${shearForce.toFixed(2)} kN`
  });

  // Step 9: Critical Section Shear (at d from support)
  const criticalShear = shearForce - (ultimateLoad * input.effectiveDepth / 1000);
  steps.push({
    title: "Step 9: Critical Section (at d from support)",
    formula: "Vd = V - w × d",
    substitution: `Vd = ${shearForce.toFixed(2)} - ${ultimateLoad.toFixed(2)} × ${input.effectiveDepth}/1000`,
    result: `Vd = ${criticalShear.toFixed(2)} kN`,
    bsReference: "BS8110 Cl. 3.4.5.2"
  });

  // Step 10: Shear Stress
  const shearStress = (criticalShear * 1000) / (input.width * input.effectiveDepth);
  const vc = calculateVc(finalTensionSteel, input.width, input.effectiveDepth, input.fcu);
  const maxShear = Math.min(0.8 * Math.sqrt(input.fcu), 5);
  
  steps.push({
    title: "Step 10: Shear Stress Check",
    formula: "v = V / (bd)",
    substitution: `v = ${(criticalShear * 1000).toFixed(0)} / (${input.width} × ${input.effectiveDepth})`,
    result: `v = ${shearStress.toFixed(2)} N/mm²
vc = ${vc.toFixed(2)} N/mm² (permissible)
vmax = ${maxShear.toFixed(2)} N/mm²`,
    isCheck: true,
    checkPassed: shearStress < maxShear,
    status: shearStress < maxShear ? (shearStress <= vc ? 'safe' : 'review') : 'unsafe',
    bsReference: "BS8110 Cl. 3.4.5"
  });

  const shearStatus: 'safe' | 'unsafe' = shearStress < maxShear ? 'safe' : 'unsafe';

  // Step 11: Shear Reinforcement Design
  let linkSize = 8;
  let linkSpacing = 300;
  
  if (shearStress > vc) {
    const links = calculateLinkSpacing(shearStress, vc, input.width, input.effectiveDepth, input.fy);
    linkSize = links.size;
    linkSpacing = links.spacing;
    
    steps.push({
      title: "Step 11: Shear Link Design",
      formula: "Asv/sv = bv(v - vc) / (0.87fyv)",
      substitution: `v > vc → Shear reinforcement required
Asv/sv = ${input.width} × (${shearStress.toFixed(2)} - ${vc.toFixed(2)}) / (0.87 × ${input.fy})`,
      result: `Provide T${linkSize} links @ ${linkSpacing}mm c/c`,
      bsReference: "BS8110 Cl. 3.4.5.5"
    });
  } else {
    steps.push({
      title: "Step 11: Shear Link Design",
      formula: "v ≤ vc → Nominal links only",
      result: `Provide T${linkSize} links @ ${linkSpacing}mm c/c (nominal)`,
      status: 'safe',
      bsReference: "BS8110 Cl. 3.4.5.3"
    });
  }

  // Step 12: Deflection Check
  const basicRatio = getBasicSpanDepthRatio('simply-supported');
  const tensionMod = getTensionModificationFactor(M_Nmm, input.width, input.effectiveDepth, finalTensionSteel, input.fy);
  const compMod = isDoublyReinforced ? getCompressionModificationFactor(compressionSteel, compressionSteel * 0.9) : 1.0;
  const allowableRatio = basicRatio * tensionMod * compMod;
  const actualRatio = (input.span * 1000) / input.effectiveDepth;
  const deflectionOK = actualRatio <= allowableRatio;
  
  steps.push({
    title: "Step 12: Deflection Check",
    formula: "Actual span/d ≤ Basic ratio × Modification factors",
    substitution: `Basic ratio = ${basicRatio}
Tension modification = ${tensionMod.toFixed(2)}
${isDoublyReinforced ? `Compression modification = ${compMod.toFixed(2)}\n` : ''}Allowable span/d = ${basicRatio} × ${tensionMod.toFixed(2)}${isDoublyReinforced ? ` × ${compMod.toFixed(2)}` : ''} = ${allowableRatio.toFixed(1)}`,
    result: `Actual span/d = ${actualRatio.toFixed(1)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
    isCheck: true,
    checkPassed: deflectionOK,
    status: deflectionOK ? 'safe' : 'unsafe',
    explanation: deflectionOK 
      ? `Actual ≤ Allowable → Deflection satisfactory ✓` 
      : `Actual > Allowable → Increase depth or add compression steel`,
    bsReference: "BS8110 Cl. 3.4.6"
  });

  const deflectionStatus: 'safe' | 'unsafe' = deflectionOK ? 'safe' : 'unsafe';

  // Step 13: Bar Selection
  const suggestBars = (area: number): string => {
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
  };

  steps.push({
    title: "Step 13: Reinforcement Selection",
    result: `Tension: ${suggestBars(finalTensionSteel)}${compressionSteel > 0 ? `\nCompression: ${suggestBars(compressionSteel)}` : ''}
Links: T${linkSize}@${linkSpacing}mm c/c`,
    explanation: "Select bars to provide area ≥ As required"
  });

  const designValid = steelOK && shearStatus === 'safe' && deflectionStatus === 'safe';

  return {
    steps,
    summary: {
      ultimateMoment,
      kValue,
      leverArm,
      tensionSteel: finalTensionSteel,
      compressionSteel,
      shearForce,
      shearStress,
      minSteel,
      isDoublyReinforced,
      designValid,
      deflectionStatus,
      shearStatus,
      linkSize,
      linkSpacing
    }
  };
}
