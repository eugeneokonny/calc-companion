export type SlabType = 'one-way' | 'two-way';
export type PanelType = 'interior' | 'edge' | 'corner' | 'cantilever';
export type EdgeContinuity = 'continuous' | 'discontinuous';

export interface SlabInput {
  slabType: SlabType;
  panelType: PanelType;
  shortEdgeContinuity: EdgeContinuity;
  longEdgeContinuity: EdgeContinuity;
  shortSpan: number; // m (lx)
  longSpan: number; // m (ly)
  deadLoad: number; // kN/m²
  liveLoad: number; // kN/m²
  fcu: number; // N/mm²
  fy: number; // N/mm²
  slabThickness: number; // mm
  cover: number; // mm
  supportCondition: 'simply-supported' | 'continuous-one-end' | 'continuous-both-ends' | 'cantilever';
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

export interface SlabResult {
  steps: CalculationStep[];
  summary: {
    slabType: string;
    panelType: string;
    ultimateLoad: number;
    shortSpanMoment: number;
    longSpanMoment?: number;
    negativeShortMoment?: number;
    negativeLongMoment?: number;
    shortSpanSteel: number;
    longSpanSteel?: number;
    effectiveDepthShort: number;
    effectiveDepthLong?: number;
    shearStress?: number;
    permissibleShear?: number;
    shearStatus?: 'safe' | 'unsafe';
    deflectionStatus?: 'safe' | 'unsafe';
    designValid: boolean;
    spanRatio?: number;
  };
}

// BS8110 Table 3.14 - Two-way slab moment coefficients for simply supported slabs
const twoWaySimplySupported: Record<number, { msx: number; msy: number }> = {
  1.0: { msx: 0.062, msy: 0.062 },
  1.1: { msx: 0.074, msy: 0.061 },
  1.2: { msx: 0.084, msy: 0.059 },
  1.3: { msx: 0.093, msy: 0.055 },
  1.4: { msx: 0.099, msy: 0.051 },
  1.5: { msx: 0.104, msy: 0.046 },
  1.75: { msx: 0.113, msy: 0.037 },
  2.0: { msx: 0.118, msy: 0.029 },
};

// BS8110 Table 3.14 - Interior panels (all edges continuous)
const twoWayInterior: Record<number, { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number }> = {
  1.0: { bsx_neg: 0.031, bsx_pos: 0.024, bsy_neg: 0.031, bsy_pos: 0.024 },
  1.1: { bsx_neg: 0.037, bsx_pos: 0.028, bsy_neg: 0.030, bsy_pos: 0.023 },
  1.2: { bsx_neg: 0.042, bsx_pos: 0.032, bsy_neg: 0.029, bsy_pos: 0.022 },
  1.3: { bsx_neg: 0.046, bsx_pos: 0.035, bsy_neg: 0.028, bsy_pos: 0.021 },
  1.4: { bsx_neg: 0.050, bsx_pos: 0.037, bsy_neg: 0.027, bsy_pos: 0.020 },
  1.5: { bsx_neg: 0.053, bsx_pos: 0.040, bsy_neg: 0.026, bsy_pos: 0.019 },
  1.75: { bsx_neg: 0.059, bsx_pos: 0.044, bsy_neg: 0.024, bsy_pos: 0.017 },
  2.0: { bsx_neg: 0.063, bsx_pos: 0.048, bsy_neg: 0.022, bsy_pos: 0.015 },
};

// BS8110 Table 3.14 - Edge panels (one short edge discontinuous)
const twoWayEdgeShort: Record<number, { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number }> = {
  1.0: { bsx_neg: 0.039, bsx_pos: 0.030, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.1: { bsx_neg: 0.044, bsx_pos: 0.034, bsy_neg: 0.037, bsy_pos: 0.028 },
  1.2: { bsx_neg: 0.049, bsx_pos: 0.037, bsy_neg: 0.036, bsy_pos: 0.027 },
  1.3: { bsx_neg: 0.053, bsx_pos: 0.040, bsy_neg: 0.034, bsy_pos: 0.026 },
  1.4: { bsx_neg: 0.057, bsx_pos: 0.043, bsy_neg: 0.033, bsy_pos: 0.025 },
  1.5: { bsx_neg: 0.060, bsx_pos: 0.045, bsy_neg: 0.031, bsy_pos: 0.024 },
  1.75: { bsx_neg: 0.065, bsx_pos: 0.049, bsy_neg: 0.028, bsy_pos: 0.021 },
  2.0: { bsx_neg: 0.069, bsx_pos: 0.052, bsy_neg: 0.025, bsy_pos: 0.019 },
};

// BS8110 Table 3.14 - Edge panels (one long edge discontinuous)
const twoWayEdgeLong: Record<number, { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number }> = {
  1.0: { bsx_neg: 0.039, bsx_pos: 0.030, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.1: { bsx_neg: 0.046, bsx_pos: 0.035, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.2: { bsx_neg: 0.052, bsx_pos: 0.039, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.3: { bsx_neg: 0.057, bsx_pos: 0.043, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.4: { bsx_neg: 0.062, bsx_pos: 0.046, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.5: { bsx_neg: 0.066, bsx_pos: 0.049, bsy_neg: 0.039, bsy_pos: 0.030 },
  1.75: { bsx_neg: 0.073, bsx_pos: 0.055, bsy_neg: 0.039, bsy_pos: 0.030 },
  2.0: { bsx_neg: 0.078, bsx_pos: 0.059, bsy_neg: 0.039, bsy_pos: 0.030 },
};

// BS8110 Table 3.14 - Corner panels (two adjacent edges discontinuous)
const twoWayCorner: Record<number, { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number }> = {
  1.0: { bsx_neg: 0.047, bsx_pos: 0.036, bsy_neg: 0.047, bsy_pos: 0.036 },
  1.1: { bsx_neg: 0.053, bsx_pos: 0.040, bsy_neg: 0.045, bsy_pos: 0.034 },
  1.2: { bsx_neg: 0.059, bsx_pos: 0.044, bsy_neg: 0.044, bsy_pos: 0.033 },
  1.3: { bsx_neg: 0.064, bsx_pos: 0.048, bsy_neg: 0.042, bsy_pos: 0.031 },
  1.4: { bsx_neg: 0.068, bsx_pos: 0.051, bsy_neg: 0.040, bsy_pos: 0.030 },
  1.5: { bsx_neg: 0.072, bsx_pos: 0.054, bsy_neg: 0.039, bsy_pos: 0.028 },
  1.75: { bsx_neg: 0.079, bsx_pos: 0.059, bsy_neg: 0.034, bsy_pos: 0.025 },
  2.0: { bsx_neg: 0.085, bsx_pos: 0.064, bsy_neg: 0.030, bsy_pos: 0.022 },
};

const spanRatios = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0];

function interpolateValue(ratio: number, values: number[]): number {
  if (ratio <= 1.0) return values[0];
  if (ratio >= 2.0) return values[values.length - 1];
  
  for (let i = 0; i < spanRatios.length - 1; i++) {
    if (ratio >= spanRatios[i] && ratio <= spanRatios[i + 1]) {
      const t = (ratio - spanRatios[i]) / (spanRatios[i + 1] - spanRatios[i]);
      return values[i] + t * (values[i + 1] - values[i]);
    }
  }
  return values[0];
}

function getTableCoefficients(
  panelType: PanelType, 
  shortEdgeCont: EdgeContinuity, 
  longEdgeCont: EdgeContinuity,
  spanRatio: number
): { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number; tableName: string } {
  let table: Record<number, { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number }>;
  let tableName: string;
  
  // Select appropriate table based on panel type and continuity
  if (panelType === 'interior' || (shortEdgeCont === 'continuous' && longEdgeCont === 'continuous')) {
    table = twoWayInterior;
    tableName = 'Table 3.14 - Interior Panel (All edges continuous)';
  } else if (panelType === 'corner' || (shortEdgeCont === 'discontinuous' && longEdgeCont === 'discontinuous')) {
    table = twoWayCorner;
    tableName = 'Table 3.14 - Corner Panel (Two adjacent edges discontinuous)';
  } else if (shortEdgeCont === 'discontinuous') {
    table = twoWayEdgeShort;
    tableName = 'Table 3.14 - Edge Panel (Short edge discontinuous)';
  } else {
    table = twoWayEdgeLong;
    tableName = 'Table 3.14 - Edge Panel (Long edge discontinuous)';
  }
  
  const ratioKeys = Object.keys(table).map(Number);
  const bsx_neg_vals = ratioKeys.map(k => table[k].bsx_neg);
  const bsx_pos_vals = ratioKeys.map(k => table[k].bsx_pos);
  const bsy_neg_vals = ratioKeys.map(k => table[k].bsy_neg);
  const bsy_pos_vals = ratioKeys.map(k => table[k].bsy_pos);
  
  return {
    bsx_neg: interpolateValue(spanRatio, bsx_neg_vals),
    bsx_pos: interpolateValue(spanRatio, bsx_pos_vals),
    bsy_neg: interpolateValue(spanRatio, bsy_neg_vals),
    bsy_pos: interpolateValue(spanRatio, bsy_pos_vals),
    tableName
  };
}

function getSimplySupported(spanRatio: number): { msx: number; msy: number } {
  const ratioKeys = Object.keys(twoWaySimplySupported).map(Number);
  const msx_vals = ratioKeys.map(k => twoWaySimplySupported[k].msx);
  const msy_vals = ratioKeys.map(k => twoWaySimplySupported[k].msy);
  
  return {
    msx: interpolateValue(spanRatio, msx_vals),
    msy: interpolateValue(spanRatio, msy_vals)
  };
}

// One-way slab moment coefficients (BS8110 Table 3.10)
function getOneWayMomentCoefficient(support: string): { positive: number; negative: number } {
  switch (support) {
    case 'simply-supported': return { positive: 0.125, negative: 0 }; // wL²/8
    case 'continuous-one-end': return { positive: 0.090, negative: 0.090 }; // wL²/11
    case 'continuous-both-ends': return { positive: 0.063, negative: 0.083 }; // wL²/16 mid, wL²/12 support
    case 'cantilever': return { positive: 0, negative: 0.500 }; // wL²/2
    default: return { positive: 0.125, negative: 0 };
  }
}

// BS8110 Table 3.9 - Basic span/effective depth ratios
function getBasicSpanDepthRatio(supportCondition: string): number {
  switch (supportCondition) {
    case 'cantilever': return 7;
    case 'simply-supported': return 20;
    case 'continuous-one-end': return 26;
    case 'continuous-both-ends': return 26;
    default: return 20;
  }
}

// Calculate tension reinforcement modification factor (BS8110 Cl. 3.4.6.5)
function getTensionModificationFactor(M: number, b: number, d: number, fy: number): number {
  const fs = (2 * fy * M) / (3 * b * d * d); // Approximate service stress
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

export function calculateSlabDesign(input: SlabInput): SlabResult {
  const steps: CalculationStep[] = [];
  const gamma_dead = 1.4;
  const gamma_live = 1.6;
  const gamma_c = 1.5;
  const gamma_s = 1.15;
  const K_prime = 0.156;

  // Assume 10mm bars for effective depth calculation
  const barDiameter = 10;
  const effectiveDepthShort = input.slabThickness - input.cover - barDiameter / 2;
  const effectiveDepthLong = effectiveDepthShort - barDiameter; // Second layer

  // STEP 0: Slab Declaration (MANDATORY)
  const spanRatio = input.longSpan / input.shortSpan;
  const actualSlabType = spanRatio > 2 ? 'one-way' : input.slabType;
  
  const panelTypeLabels: Record<PanelType, string> = {
    'interior': 'Interior Panel',
    'edge': 'Edge Panel',
    'corner': 'Corner Panel',
    'cantilever': 'Cantilever Panel'
  };
  
  steps.push({
    title: "SLAB DECLARATION",
    result: `Type: ${actualSlabType === 'one-way' ? 'ONE-WAY SLAB' : 'TWO-WAY SLAB'}
Panel: ${panelTypeLabels[input.panelType]}
Short Edge: ${input.shortEdgeContinuity}
Long Edge: ${input.longEdgeContinuity}`,
    explanation: "This slab design is in accordance with BS 8110-1:1997",
    bsReference: actualSlabType === 'one-way' ? 'Table 3.10' : 'Tables 3.14 & 3.15',
    status: 'safe'
  });

  // Step 1: Span Ratio Verification
  steps.push({
    title: "Step 1: Span Ratio Verification",
    formula: "ly/lx ratio determines slab type",
    substitution: `ly/lx = ${input.longSpan.toFixed(2)} / ${input.shortSpan.toFixed(2)} = ${spanRatio.toFixed(3)}`,
    result: spanRatio > 2 
      ? `ly/lx = ${spanRatio.toFixed(2)} > 2 → Design as ONE-WAY slab`
      : `ly/lx = ${spanRatio.toFixed(2)} ≤ 2 → Design as TWO-WAY slab`,
    bsReference: 'BS8110 Cl. 3.5.3.3',
    status: 'safe'
  });

  // Step 2: Ultimate Design Load
  const ultimateLoad = gamma_dead * input.deadLoad + gamma_live * input.liveLoad;
  
  steps.push({
    title: "Step 2: Ultimate Design Load",
    formula: "n = γf,dead × Gk + γf,live × Qk",
    substitution: `n = 1.4 × ${input.deadLoad} + 1.6 × ${input.liveLoad}`,
    result: `n = ${ultimateLoad.toFixed(2)} kN/m²`,
    bsReference: 'BS8110 Cl. 2.4.3'
  });

  // Step 3: Effective Depth
  steps.push({
    title: "Step 3: Effective Depth Calculation",
    formula: "d = h - cover - φ/2",
    substitution: `d = ${input.slabThickness} - ${input.cover} - ${barDiameter}/2`,
    result: `d (short span) = ${effectiveDepthShort.toFixed(0)} mm
d (long span) = ${effectiveDepthLong.toFixed(0)} mm (second layer)`,
    bsReference: 'BS8110 Cl. 3.4.4.1'
  });

  let shortSpanMoment: number;
  let longSpanMoment: number | undefined;
  let negativeShortMoment: number | undefined;
  let negativeLongMoment: number | undefined;
  let shortSpanSteel: number;
  let longSpanSteel: number | undefined;
  let designValid = true;
  let shearStatus: 'safe' | 'unsafe' = 'safe';
  let deflectionStatus: 'safe' | 'unsafe' = 'safe';
  let shearStress = 0;
  let permissibleShear = 0;

  if (actualSlabType === 'one-way') {
    // ONE-WAY SLAB DESIGN (BS8110 Table 3.10)
    const coeffs = getOneWayMomentCoefficient(input.supportCondition);
    
    // Step 4: Moment Coefficients
    steps.push({
      title: "Step 4: Moment Coefficients (One-Way Slab)",
      formula: "Coefficients from BS8110 Table 3.10",
      result: `Positive moment coefficient: ${coeffs.positive}
Negative moment coefficient: ${coeffs.negative}`,
      bsReference: 'BS8110 Table 3.10'
    });

    // Step 5: Design Moments
    shortSpanMoment = coeffs.positive * ultimateLoad * Math.pow(input.shortSpan, 2);
    negativeShortMoment = coeffs.negative * ultimateLoad * Math.pow(input.shortSpan, 2);
    
    steps.push({
      title: "Step 5: Design Moments",
      formula: "M = β × n × lx²",
      substitution: `M⁺ = ${coeffs.positive} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²
M⁻ = ${coeffs.negative} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²`,
      result: `M⁺ (mid-span) = ${shortSpanMoment.toFixed(2)} kNm/m
M⁻ (support) = ${negativeShortMoment.toFixed(2)} kNm/m`
    });

    // Step 6: K-value check
    const M_Nmm = shortSpanMoment * 1e6;
    const b = 1000;
    const K = M_Nmm / (b * Math.pow(effectiveDepthShort, 2) * input.fcu);
    
    steps.push({
      title: "Step 6: K-value Check",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${(M_Nmm / 1e6).toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthShort.toFixed(0)}² × ${input.fcu})`,
      result: `K = ${K.toFixed(4)}`,
      isCheck: true,
      checkPassed: K <= K_prime,
      status: K <= K_prime ? 'safe' : 'unsafe',
      explanation: K <= K_prime 
        ? `K = ${K.toFixed(4)} < K' = ${K_prime} → Singly reinforced`
        : `K = ${K.toFixed(4)} > K' = ${K_prime} → Increase depth`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    if (K > K_prime) designValid = false;

    // Step 7: Lever Arm
    const z = Math.min(effectiveDepthShort * (0.5 + Math.sqrt(0.25 - K / 0.9)), 0.95 * effectiveDepthShort);
    
    steps.push({
      title: "Step 7: Lever Arm",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      result: `z = ${z.toFixed(1)} mm`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    // Step 8: Required Reinforcement
    shortSpanSteel = M_Nmm / (0.87 * input.fy * z);
    
    steps.push({
      title: "Step 8: Required Steel Area",
      formula: "As = M / (0.87fy × z)",
      substitution: `As = ${(M_Nmm / 1e6).toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z.toFixed(1)})`,
      result: `As = ${shortSpanSteel.toFixed(0)} mm²/m`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    // Step 9: Minimum Steel Check
    const minSteel = 0.0013 * 1000 * input.slabThickness;
    const steelOK = shortSpanSteel >= minSteel;
    
    steps.push({
      title: "Step 9: Minimum Steel Check",
      formula: "As,min = 0.13%bh",
      substitution: `As,min = 0.0013 × 1000 × ${input.slabThickness}`,
      result: `As,min = ${minSteel.toFixed(0)} mm²/m`,
      isCheck: true,
      checkPassed: steelOK,
      status: steelOK ? 'safe' : 'review',
      explanation: steelOK 
        ? `As = ${shortSpanSteel.toFixed(0)} > As,min ✓`
        : `Use As,min = ${minSteel.toFixed(0)} mm²/m`,
      bsReference: 'BS8110 Cl. 3.12.5.3'
    });

    shortSpanSteel = Math.max(shortSpanSteel, minSteel);
    const distSteel = minSteel;
    longSpanSteel = distSteel;

    // Step 10: Shear Check
    const shearForce = 0.5 * ultimateLoad * input.shortSpan;
    shearStress = (shearForce * 1000) / (1000 * effectiveDepthShort);
    permissibleShear = calculateVc(shortSpanSteel, 1000, effectiveDepthShort, input.fcu);
    shearStatus = shearStress <= permissibleShear ? 'safe' : 'unsafe';
    
    steps.push({
      title: "Step 10: Shear Check",
      formula: "v = V / (bd), vc = permissible shear stress",
      substitution: `V = 0.5 × ${ultimateLoad.toFixed(2)} × ${input.shortSpan} = ${shearForce.toFixed(2)} kN
v = ${(shearForce * 1000).toFixed(0)} / (1000 × ${effectiveDepthShort.toFixed(0)})`,
      result: `v = ${shearStress.toFixed(3)} N/mm²
vc = ${permissibleShear.toFixed(3)} N/mm²`,
      isCheck: true,
      checkPassed: shearStatus === 'safe',
      status: shearStatus,
      explanation: shearStatus === 'safe' 
        ? `v < vc → Shear capacity adequate ✓` 
        : `v > vc → Shear reinforcement required`,
      bsReference: 'BS8110 Cl. 3.4.5'
    });

    if (shearStatus === 'unsafe') designValid = false;

    // Step 11: Deflection Check
    const basicRatio = getBasicSpanDepthRatio(input.supportCondition);
    const tensionMod = getTensionModificationFactor(shortSpanMoment * 1e6, 1000, effectiveDepthShort, input.fy);
    const allowableRatio = basicRatio * tensionMod;
    const actualRatio = (input.shortSpan * 1000) / effectiveDepthShort;
    deflectionStatus = actualRatio <= allowableRatio ? 'safe' : 'unsafe';
    
    steps.push({
      title: "Step 11: Deflection Check",
      formula: "Actual span/d ≤ Basic ratio × Modification factor",
      substitution: `Basic ratio = ${basicRatio}
Tension modification factor = ${tensionMod.toFixed(2)}
Allowable span/d = ${basicRatio} × ${tensionMod.toFixed(2)} = ${allowableRatio.toFixed(1)}`,
      result: `Actual span/d = ${actualRatio.toFixed(1)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
      isCheck: true,
      checkPassed: deflectionStatus === 'safe',
      status: deflectionStatus,
      explanation: deflectionStatus === 'safe' 
        ? `Actual ≤ Allowable → Deflection OK ✓` 
        : `Actual > Allowable → Increase depth`,
      bsReference: 'BS8110 Cl. 3.4.6'
    });

    if (deflectionStatus === 'unsafe') designValid = false;

    // Step 12: Reinforcement Provision
    const mainBars = suggestBars(shortSpanSteel);
    const distBars = suggestBars(distSteel);
    
    steps.push({
      title: "Step 12: Reinforcement Provision",
      result: `Main Steel (Short Span): ${mainBars}
Distribution Steel: ${distBars}`
    });

  } else {
    // TWO-WAY SLAB DESIGN (BS8110 Tables 3.14 & 3.15)
    
    // Step 4: Slab Declaration
    steps.push({
      title: "Step 4: Two-Way Slab Declaration",
      result: `This slab is designed as a ${panelTypeLabels[input.panelType].toLowerCase()} in accordance with BS 8110 Tables 3.14 and 3.15.`,
      status: 'safe'
    });

    // Step 5: Moment Coefficients
    let coeffs: { bsx_neg: number; bsx_pos: number; bsy_neg: number; bsy_pos: number };
    let tableName: string;

    if (input.supportCondition === 'simply-supported') {
      const ssCoeffs = getSimplySupported(spanRatio);
      coeffs = { bsx_neg: 0, bsx_pos: ssCoeffs.msx, bsy_neg: 0, bsy_pos: ssCoeffs.msy };
      tableName = 'Table 3.14 - Simply Supported (No restraint at corners)';
    } else {
      const tableCoeffs = getTableCoefficients(input.panelType, input.shortEdgeContinuity, input.longEdgeContinuity, spanRatio);
      coeffs = tableCoeffs;
      tableName = tableCoeffs.tableName;
    }

    steps.push({
      title: "Step 5: Moment Coefficients",
      formula: `Coefficients from BS8110 ${tableName}`,
      substitution: `For ly/lx = ${spanRatio.toFixed(3)}, using linear interpolation:`,
      result: `βsx⁻ (negative, short) = ${coeffs.bsx_neg.toFixed(4)}
βsx⁺ (positive, short) = ${coeffs.bsx_pos.toFixed(4)}
βsy⁻ (negative, long) = ${coeffs.bsy_neg.toFixed(4)}
βsy⁺ (positive, long) = ${coeffs.bsy_pos.toFixed(4)}`,
      bsReference: 'BS8110 Table 3.14'
    });

    // Step 6: Design Moments
    shortSpanMoment = coeffs.bsx_pos * ultimateLoad * Math.pow(input.shortSpan, 2);
    negativeShortMoment = coeffs.bsx_neg * ultimateLoad * Math.pow(input.shortSpan, 2);
    longSpanMoment = coeffs.bsy_pos * ultimateLoad * Math.pow(input.shortSpan, 2);
    negativeLongMoment = coeffs.bsy_neg * ultimateLoad * Math.pow(input.shortSpan, 2);
    
    steps.push({
      title: "Step 6: Design Moments",
      formula: "M = β × n × lx²",
      substitution: `Short span positive: ${coeffs.bsx_pos.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²
Short span negative: ${coeffs.bsx_neg.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²
Long span positive: ${coeffs.bsy_pos.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²
Long span negative: ${coeffs.bsy_neg.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²`,
      result: `Msx⁺ = ${shortSpanMoment.toFixed(2)} kNm/m
Msx⁻ = ${negativeShortMoment.toFixed(2)} kNm/m
Msy⁺ = ${longSpanMoment.toFixed(2)} kNm/m
Msy⁻ = ${negativeLongMoment.toFixed(2)} kNm/m`
    });

    // Step 7: K-value Check (Short Span - governs)
    const M_short_Nmm = shortSpanMoment * 1e6;
    const K_short = M_short_Nmm / (1000 * Math.pow(effectiveDepthShort, 2) * input.fcu);
    
    steps.push({
      title: "Step 7: K-value Check - Short Span",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${shortSpanMoment.toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthShort.toFixed(0)}² × ${input.fcu})`,
      result: `Ksx = ${K_short.toFixed(4)}`,
      isCheck: true,
      checkPassed: K_short <= K_prime,
      status: K_short <= K_prime ? 'safe' : 'unsafe',
      explanation: K_short <= K_prime 
        ? `K < K' = ${K_prime} → Singly reinforced ✓`
        : `K > K' → Increase depth`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    if (K_short > K_prime) designValid = false;

    // Step 8: Lever Arm - Short Span
    const z_short = Math.min(effectiveDepthShort * (0.5 + Math.sqrt(0.25 - K_short / 0.9)), 0.95 * effectiveDepthShort);
    
    steps.push({
      title: "Step 8: Lever Arm - Short Span",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      result: `zsx = ${z_short.toFixed(1)} mm`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    // Step 9: Reinforcement - Short Span
    shortSpanSteel = M_short_Nmm / (0.87 * input.fy * z_short);
    
    steps.push({
      title: "Step 9: Steel Area - Short Span",
      formula: "Asx = Msx / (0.87fy × z)",
      substitution: `Asx = ${shortSpanMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z_short.toFixed(1)})`,
      result: `Asx = ${shortSpanSteel.toFixed(0)} mm²/m`,
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    // Step 10: K-value Check - Long Span
    const M_long_Nmm = longSpanMoment * 1e6;
    const K_long = M_long_Nmm / (1000 * Math.pow(effectiveDepthLong, 2) * input.fcu);
    
    steps.push({
      title: "Step 10: K-value Check - Long Span",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${longSpanMoment.toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthLong.toFixed(0)}² × ${input.fcu})`,
      result: `Ksy = ${K_long.toFixed(4)}`,
      isCheck: true,
      checkPassed: K_long <= K_prime,
      status: K_long <= K_prime ? 'safe' : 'unsafe',
      bsReference: 'BS8110 Cl. 3.4.4.4'
    });

    if (K_long > K_prime) designValid = false;

    // Step 11: Lever Arm - Long Span
    const z_long = Math.min(effectiveDepthLong * (0.5 + Math.sqrt(0.25 - K_long / 0.9)), 0.95 * effectiveDepthLong);
    
    steps.push({
      title: "Step 11: Lever Arm - Long Span",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      result: `zsy = ${z_long.toFixed(1)} mm`
    });

    // Step 12: Reinforcement - Long Span
    longSpanSteel = M_long_Nmm / (0.87 * input.fy * z_long);
    
    steps.push({
      title: "Step 12: Steel Area - Long Span",
      formula: "Asy = Msy / (0.87fy × z)",
      substitution: `Asy = ${longSpanMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z_long.toFixed(1)})`,
      result: `Asy = ${longSpanSteel.toFixed(0)} mm²/m`
    });

    // Step 13: Minimum Steel Check
    const minSteel = 0.0013 * 1000 * input.slabThickness;
    const shortOK = shortSpanSteel >= minSteel;
    const longOK = longSpanSteel >= minSteel;
    
    steps.push({
      title: "Step 13: Minimum Steel Check",
      formula: "As,min = 0.13%bh",
      substitution: `As,min = 0.0013 × 1000 × ${input.slabThickness}`,
      result: `As,min = ${minSteel.toFixed(0)} mm²/m`,
      isCheck: true,
      checkPassed: shortOK && longOK,
      status: (shortOK && longOK) ? 'safe' : 'review',
      explanation: `Short span: ${shortOK ? '✓' : 'Use min'}, Long span: ${longOK ? '✓' : 'Use min'}`,
      bsReference: 'BS8110 Cl. 3.12.5.3'
    });

    shortSpanSteel = Math.max(shortSpanSteel, minSteel);
    longSpanSteel = Math.max(longSpanSteel, minSteel);

    // Step 14: Shear Check
    const shearForce = 0.5 * ultimateLoad * input.shortSpan;
    shearStress = (shearForce * 1000) / (1000 * effectiveDepthShort);
    permissibleShear = calculateVc(shortSpanSteel, 1000, effectiveDepthShort, input.fcu);
    shearStatus = shearStress <= permissibleShear ? 'safe' : 'unsafe';
    
    steps.push({
      title: "Step 14: Shear Check",
      formula: "v = V / (bd) ≤ vc",
      substitution: `V = 0.5 × ${ultimateLoad.toFixed(2)} × ${input.shortSpan} = ${shearForce.toFixed(2)} kN
v = ${(shearForce * 1000).toFixed(0)} / (1000 × ${effectiveDepthShort.toFixed(0)})`,
      result: `v = ${shearStress.toFixed(3)} N/mm²
vc = ${permissibleShear.toFixed(3)} N/mm²`,
      isCheck: true,
      checkPassed: shearStatus === 'safe',
      status: shearStatus,
      explanation: shearStatus === 'safe' 
        ? `v < vc → Shear OK ✓` 
        : `v > vc → Increase depth or provide shear reinforcement`,
      bsReference: 'BS8110 Cl. 3.4.5'
    });

    if (shearStatus === 'unsafe') designValid = false;

    // Step 15: Deflection Check
    const basicRatio = getBasicSpanDepthRatio(input.supportCondition);
    const tensionMod = getTensionModificationFactor(shortSpanMoment * 1e6, 1000, effectiveDepthShort, input.fy);
    const allowableRatio = basicRatio * tensionMod;
    const actualRatio = (input.shortSpan * 1000) / effectiveDepthShort;
    deflectionStatus = actualRatio <= allowableRatio ? 'safe' : 'unsafe';
    
    steps.push({
      title: "Step 15: Deflection Check",
      formula: "Actual span/d ≤ Basic ratio × Modification factor",
      substitution: `Basic span/depth ratio = ${basicRatio} (${input.supportCondition})
Tension modification factor = ${tensionMod.toFixed(2)}
Allowable span/d = ${basicRatio} × ${tensionMod.toFixed(2)} = ${allowableRatio.toFixed(1)}`,
      result: `Actual span/d = ${actualRatio.toFixed(1)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
      isCheck: true,
      checkPassed: deflectionStatus === 'safe',
      status: deflectionStatus,
      explanation: deflectionStatus === 'safe' 
        ? `Actual ≤ Allowable → Deflection satisfactory ✓` 
        : `Actual > Allowable → Increase slab depth`,
      bsReference: 'BS8110 Cl. 3.4.6'
    });

    if (deflectionStatus === 'unsafe') designValid = false;

    // Step 16: Reinforcement Provision
    const shortBars = suggestBars(shortSpanSteel);
    const longBars = suggestBars(longSpanSteel);
    
    steps.push({
      title: "Step 16: Reinforcement Provision",
      result: `Short Span (Bottom Layer): ${shortBars}
Long Span (Top Layer): ${longBars}`,
      explanation: "Short span bars placed as bottom layer for greater effective depth"
    });
  }

  return {
    steps,
    summary: {
      slabType: actualSlabType === 'one-way' ? 'One-Way Slab' : 'Two-Way Slab',
      panelType: panelTypeLabels[input.panelType],
      ultimateLoad,
      shortSpanMoment,
      longSpanMoment,
      negativeShortMoment,
      negativeLongMoment,
      shortSpanSteel,
      longSpanSteel,
      effectiveDepthShort,
      effectiveDepthLong: actualSlabType === 'two-way' ? effectiveDepthLong : undefined,
      shearStress,
      permissibleShear,
      shearStatus,
      deflectionStatus,
      designValid,
      spanRatio
    }
  };
}

function suggestBars(area: number): string {
  const options = [
    { dia: 8, spacing: 150, area: 335 },
    { dia: 8, spacing: 200, area: 251 },
    { dia: 10, spacing: 150, area: 524 },
    { dia: 10, spacing: 200, area: 393 },
    { dia: 10, spacing: 250, area: 314 },
    { dia: 12, spacing: 150, area: 754 },
    { dia: 12, spacing: 200, area: 566 },
    { dia: 12, spacing: 250, area: 452 },
    { dia: 16, spacing: 150, area: 1340 },
    { dia: 16, spacing: 200, area: 1005 },
  ];
  
  for (const opt of options) {
    if (opt.area >= area) {
      return `T${opt.dia}@${opt.spacing}mm c/c (${opt.area} mm²/m provided)`;
    }
  }
  return "T16@125mm c/c or use larger bars";
}
