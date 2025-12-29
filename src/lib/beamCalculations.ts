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
  };
}

export function calculateBeamDesign(input: BeamInput): BeamResult {
  const steps: CalculationStep[] = [];
  
  // Step 1: Load Calculation
  const ultimateLoad = 1.4 * input.deadLoad + 1.6 * input.liveLoad;
  steps.push({
    title: "Step 1: Ultimate Design Load (BS8110 Cl. 2.4.3)",
    formula: "w = 1.4Gk + 1.6Qk",
    substitution: `w = 1.4 × ${input.deadLoad} + 1.6 × ${input.liveLoad}`,
    result: `w = ${ultimateLoad.toFixed(2)} kN/m`,
    explanation: "Applying partial safety factors for dead (1.4) and live (1.6) loads"
  });

  // Step 2: Ultimate Moment
  const ultimateMoment = (ultimateLoad * Math.pow(input.span, 2)) / 8;
  steps.push({
    title: "Step 2: Ultimate Bending Moment",
    formula: "M = wL²/8 (for simply supported beam with UDL)",
    substitution: `M = ${ultimateLoad.toFixed(2)} × ${input.span}² / 8`,
    result: `M = ${ultimateMoment.toFixed(2)} kN·m = ${(ultimateMoment * 1e6).toExponential(2)} N·mm`,
    explanation: "Maximum moment at mid-span for simply supported beam"
  });

  // Step 3: K Value
  const M_Nmm = ultimateMoment * 1e6;
  const kValue = M_Nmm / (input.width * Math.pow(input.effectiveDepth, 2) * input.fcu);
  const kPrime = 0.156; // For redistribution ≤ 10%
  
  steps.push({
    title: "Step 3: K Value (BS8110 Cl. 3.4.4.4)",
    formula: "K = M / (bd²fcu)",
    substitution: `K = ${M_Nmm.toExponential(2)} / (${input.width} × ${input.effectiveDepth}² × ${input.fcu})`,
    result: `K = ${kValue.toFixed(4)}`,
    explanation: "Dimensionless parameter to determine beam type"
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
    explanation: isDoublyReinforced 
      ? "K > K': Compression reinforcement needed to resist excess moment"
      : "K ≤ K': Section adequate for singly reinforced design"
  });

  // Step 5: Lever Arm
  const kForZ = isDoublyReinforced ? kPrime : kValue;
  const leverArmRatio = 0.5 + Math.sqrt(0.25 - kForZ / 0.9);
  const leverArm = Math.min(leverArmRatio, 0.95) * input.effectiveDepth;
  
  steps.push({
    title: "Step 5: Lever Arm (BS8110 Cl. 3.4.4.4)",
    formula: "z = d[0.5 + √(0.25 - K/0.9)]",
    substitution: `z = ${input.effectiveDepth}[0.5 + √(0.25 - ${kForZ.toFixed(4)}/0.9)]`,
    result: `z = ${leverArm.toFixed(1)} mm (z/d = ${(leverArm/input.effectiveDepth).toFixed(3)})`,
    explanation: "Lever arm limited to 0.95d maximum"
  });

  // Step 6: Tension Steel Area
  let tensionSteel: number;
  let compressionSteel = 0;
  
  if (isDoublyReinforced) {
    // Moment capacity at K'
    const MLimit = kPrime * input.width * Math.pow(input.effectiveDepth, 2) * input.fcu;
    const excessMoment = M_Nmm - MLimit;
    const dPrime = input.cover + 10; // Assuming 10mm dia for compression
    
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
      substitution: `As' = (${M_Nmm.toExponential(2)} - ${MLimit.toExponential(2)}) / [0.87 × ${input.fy} × (${input.effectiveDepth} - ${dPrime})]`,
      result: `As' = ${compressionSteel.toFixed(0)} mm²`
    });
    
    steps.push({
      title: "Step 6c: Tension Steel Area",
      formula: "As = M'/(0.87fy·z) + As'",
      substitution: `As = ${MLimit.toExponential(2)}/(0.87 × ${input.fy} × ${leverArm.toFixed(1)}) + ${compressionSteel.toFixed(0)}`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`
    });
  } else {
    tensionSteel = M_Nmm / (0.87 * input.fy * leverArm);
    
    steps.push({
      title: "Step 6: Tension Steel Area (BS8110 Cl. 3.4.4.4)",
      formula: "As = M / (0.87fy·z)",
      substitution: `As = ${M_Nmm.toExponential(2)} / (0.87 × ${input.fy} × ${leverArm.toFixed(1)})`,
      result: `As = ${tensionSteel.toFixed(0)} mm²`,
      explanation: "Required area of tension reinforcement"
    });
  }

  // Step 7: Minimum Steel Check
  const minSteel = 0.0013 * input.width * input.effectiveDepth;
  const steelOK = tensionSteel >= minSteel;
  
  steps.push({
    title: "Step 7: Minimum Steel Check (BS8110 Cl. 3.12.5.3)",
    formula: "As,min = 0.13%bh ≈ 0.13%bd",
    substitution: `As,min = 0.0013 × ${input.width} × ${input.effectiveDepth}`,
    result: `As,min = ${minSteel.toFixed(0)} mm²`,
    isCheck: true,
    checkPassed: steelOK,
    explanation: steelOK 
      ? `As = ${tensionSteel.toFixed(0)} mm² > As,min = ${minSteel.toFixed(0)} mm² ✓`
      : `As = ${tensionSteel.toFixed(0)} mm² < As,min = ${minSteel.toFixed(0)} mm² - Use minimum steel`
  });

  const finalTensionSteel = Math.max(tensionSteel, minSteel);

  // Step 8: Shear Check
  const shearForce = (ultimateLoad * input.span) / 2;
  const shearStress = (shearForce * 1000) / (input.width * input.effectiveDepth);
  const vc = 0.79 * Math.pow((100 * finalTensionSteel) / (input.width * input.effectiveDepth), 1/3) 
             * Math.pow(400 / input.effectiveDepth, 1/4) 
             * Math.pow(input.fcu / 25, 1/3) / 1.25;
  
  steps.push({
    title: "Step 8: Shear Force",
    formula: "V = wL/2",
    substitution: `V = ${ultimateLoad.toFixed(2)} × ${input.span} / 2`,
    result: `V = ${shearForce.toFixed(2)} kN`
  });

  steps.push({
    title: "Step 9: Shear Stress (BS8110 Cl. 3.4.5.2)",
    formula: "v = V / (bd)",
    substitution: `v = ${(shearForce * 1000).toFixed(0)} / (${input.width} × ${input.effectiveDepth})`,
    result: `v = ${shearStress.toFixed(2)} N/mm²`
  });

  const maxShear = 0.8 * Math.sqrt(input.fcu);
  const shearOK = shearStress < maxShear;
  
  steps.push({
    title: "Step 10: Maximum Shear Check",
    formula: "v < 0.8√fcu and v < 5 N/mm²",
    substitution: `v = ${shearStress.toFixed(2)} vs vmax = 0.8√${input.fcu} = ${maxShear.toFixed(2)} N/mm²`,
    result: shearStress < maxShear && shearStress < 5 ? "Shear stress OK" : "Section inadequate - increase size",
    isCheck: true,
    checkPassed: shearOK && shearStress < 5
  });

  // Bar Selection Suggestion
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
    title: "Step 11: Reinforcement Selection",
    result: `Tension: ${suggestBars(finalTensionSteel)}${compressionSteel > 0 ? ` | Compression: ${suggestBars(compressionSteel)}` : ""}`,
    explanation: "Select bars to provide area ≥ As required"
  });

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
      designValid: shearOK && steelOK
    }
  };
}
