export interface SlabInput {
  slabType: 'one-way' | 'two-way';
  shortSpan: number; // m (ly for two-way, main span for one-way)
  longSpan: number; // m (lx for two-way, not used for one-way)
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
}

export interface SlabResult {
  steps: CalculationStep[];
  summary: {
    slabType: string;
    ultimateLoad: number;
    shortSpanMoment: number;
    longSpanMoment?: number;
    shortSpanSteel: number;
    longSpanSteel?: number;
    effectiveDepthShort: number;
    effectiveDepthLong?: number;
    designValid: boolean;
    spanRatio?: number;
  };
}

// BS8110 moment coefficients for two-way slabs (Table 3.14)
const twoWayCoefficients: Record<string, { msx: number; msy: number }[]> = {
  'simply-supported': [
    { msx: 0.062, msy: 0.062 }, // ly/lx = 1.0
    { msx: 0.074, msy: 0.061 }, // 1.1
    { msx: 0.084, msy: 0.059 }, // 1.2
    { msx: 0.093, msy: 0.055 }, // 1.3
    { msx: 0.099, msy: 0.051 }, // 1.4
    { msx: 0.104, msy: 0.046 }, // 1.5
    { msx: 0.113, msy: 0.037 }, // 1.75
    { msx: 0.118, msy: 0.029 }, // 2.0
  ]
};

const spanRatios = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.75, 2.0];

function interpolateCoefficient(ratio: number, coefficients: { msx: number; msy: number }[]): { msx: number; msy: number } {
  if (ratio <= 1.0) return coefficients[0];
  if (ratio >= 2.0) return coefficients[7];
  
  for (let i = 0; i < spanRatios.length - 1; i++) {
    if (ratio >= spanRatios[i] && ratio <= spanRatios[i + 1]) {
      const t = (ratio - spanRatios[i]) / (spanRatios[i + 1] - spanRatios[i]);
      return {
        msx: coefficients[i].msx + t * (coefficients[i + 1].msx - coefficients[i].msx),
        msy: coefficients[i].msy + t * (coefficients[i + 1].msy - coefficients[i].msy)
      };
    }
  }
  return coefficients[0];
}

// One-way slab moment coefficients
function getOneWayMomentCoefficient(support: string): number {
  switch (support) {
    case 'simply-supported': return 0.125; // wL²/8
    case 'continuous-one-end': return 0.100; // wL²/10
    case 'continuous-both-ends': return 0.083; // wL²/12
    case 'cantilever': return 0.500; // wL²/2
    default: return 0.125;
  }
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

  // Step 1: Determine Slab Type
  const spanRatio = input.longSpan / input.shortSpan;
  const actualSlabType = spanRatio > 2 ? 'one-way' : input.slabType;
  
  steps.push({
    title: "Step 1: Slab Type Determination",
    formula: "If ly/lx > 2, design as one-way slab",
    substitution: `ly/lx = ${input.longSpan} / ${input.shortSpan} = ${spanRatio.toFixed(2)}`,
    result: actualSlabType === 'one-way' 
      ? `ly/lx = ${spanRatio.toFixed(2)} → Design as ONE-WAY slab`
      : `ly/lx = ${spanRatio.toFixed(2)} ≤ 2 → Design as TWO-WAY slab`,
    explanation: actualSlabType === 'one-way' 
      ? "Slab spans primarily in short direction"
      : "Slab spans in both directions"
  });

  // Step 2: Calculate Ultimate Design Load
  const ultimateLoad = gamma_dead * input.deadLoad + gamma_live * input.liveLoad;
  
  steps.push({
    title: "Step 2: Ultimate Design Load (BS8110 Cl. 2.4.3)",
    formula: "n = 1.4Gk + 1.6Qk",
    substitution: `n = 1.4 × ${input.deadLoad} + 1.6 × ${input.liveLoad}`,
    result: `n = ${ultimateLoad.toFixed(2)} kN/m²`
  });

  // Step 3: Effective Depth
  steps.push({
    title: "Step 3: Effective Depth",
    formula: "d = h - cover - φ/2",
    substitution: `d = ${input.slabThickness} - ${input.cover} - ${barDiameter}/2`,
    result: `d (short span) = ${effectiveDepthShort.toFixed(0)} mm`,
    explanation: actualSlabType === 'two-way' 
      ? `d (long span) = ${effectiveDepthLong.toFixed(0)} mm (second layer)`
      : undefined
  });

  let shortSpanMoment: number;
  let longSpanMoment: number | undefined;
  let shortSpanSteel: number;
  let longSpanSteel: number | undefined;
  let designValid = true;

  if (actualSlabType === 'one-way') {
    // ONE-WAY SLAB DESIGN
    const momentCoeff = getOneWayMomentCoefficient(input.supportCondition);
    
    // Step 4: Design Moment
    shortSpanMoment = momentCoeff * ultimateLoad * Math.pow(input.shortSpan, 2);
    
    const supportDesc: Record<string, string> = {
      'simply-supported': 'wL²/8',
      'continuous-one-end': 'wL²/10',
      'continuous-both-ends': 'wL²/12',
      'cantilever': 'wL²/2'
    };

    steps.push({
      title: "Step 4: Design Moment (One-Way Slab)",
      formula: `M = ${supportDesc[input.supportCondition]}`,
      substitution: `M = ${momentCoeff} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²`,
      result: `M = ${shortSpanMoment.toFixed(2)} kNm/m`
    });

    // Step 5: K-value check
    const M_Nmm = shortSpanMoment * 1e6;
    const b = 1000; // per metre width
    const K = M_Nmm / (b * Math.pow(effectiveDepthShort, 2) * input.fcu);
    
    steps.push({
      title: "Step 5: K-value Check (BS8110 Cl. 3.4.4.4)",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${(M_Nmm / 1e6).toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthShort.toFixed(0)}² × ${input.fcu})`,
      result: `K = ${K.toFixed(4)}`,
      isCheck: true,
      checkPassed: K <= K_prime,
      explanation: K <= K_prime 
        ? `K = ${K.toFixed(4)} < K' = ${K_prime} → Singly reinforced OK`
        : `K = ${K.toFixed(4)} > K' = ${K_prime} → Increase depth or add compression steel`
    });

    if (K > K_prime) designValid = false;

    // Step 6: Lever Arm
    const z = Math.min(effectiveDepthShort * (0.5 + Math.sqrt(0.25 - K / 0.9)), 0.95 * effectiveDepthShort);
    
    steps.push({
      title: "Step 6: Lever Arm",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      substitution: `z = ${effectiveDepthShort.toFixed(0)} × (0.5 + √(0.25 - ${K.toFixed(4)}/0.9))`,
      result: `z = ${z.toFixed(1)} mm`
    });

    // Step 7: Required Reinforcement
    shortSpanSteel = M_Nmm / (0.87 * input.fy * z);
    
    steps.push({
      title: "Step 7: Required Reinforcement (BS8110 Cl. 3.4.4.4)",
      formula: "As = M / (0.87fy × z)",
      substitution: `As = ${(M_Nmm / 1e6).toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z.toFixed(1)})`,
      result: `As = ${shortSpanSteel.toFixed(0)} mm²/m`
    });

    // Step 8: Minimum Steel Check
    const minSteel = 0.0013 * 1000 * input.slabThickness;
    const steelOK = shortSpanSteel >= minSteel;
    
    steps.push({
      title: "Step 8: Minimum Steel Check (BS8110 Cl. 3.12.5.3)",
      formula: "As,min = 0.13%bh",
      substitution: `As,min = 0.0013 × 1000 × ${input.slabThickness}`,
      result: `As,min = ${minSteel.toFixed(0)} mm²/m`,
      isCheck: true,
      checkPassed: steelOK,
      explanation: steelOK 
        ? `As = ${shortSpanSteel.toFixed(0)} mm²/m > As,min ✓`
        : `Use As,min = ${minSteel.toFixed(0)} mm²/m`
    });

    shortSpanSteel = Math.max(shortSpanSteel, minSteel);

    // Step 9: Distribution Steel
    const distSteel = 0.0013 * 1000 * input.slabThickness;
    
    steps.push({
      title: "Step 9: Distribution Steel (Secondary Reinforcement)",
      formula: "As,dist = 0.13%bh (minimum)",
      substitution: `As,dist = 0.0013 × 1000 × ${input.slabThickness}`,
      result: `As,dist = ${distSteel.toFixed(0)} mm²/m`,
      explanation: "Placed perpendicular to main reinforcement"
    });

    longSpanSteel = distSteel;

    // Step 10: Provide reinforcement
    const mainBars = suggestBars(shortSpanSteel);
    const distBars = suggestBars(distSteel);
    
    steps.push({
      title: "Step 10: Reinforcement Provision",
      result: `Main Steel: ${mainBars}\nDistribution Steel: ${distBars}`,
      explanation: "Main bars in short span direction, distribution bars in long span"
    });

  } else {
    // TWO-WAY SLAB DESIGN
    const coeffs = interpolateCoefficient(spanRatio, twoWayCoefficients['simply-supported']);
    
    // Step 4: Moment Coefficients
    steps.push({
      title: "Step 4: Moment Coefficients (BS8110 Table 3.14)",
      formula: "msx, msy from Table 3.14 based on ly/lx",
      substitution: `For ly/lx = ${spanRatio.toFixed(2)}, support condition: ${input.supportCondition}`,
      result: `βsx = ${coeffs.msx.toFixed(4)}, βsy = ${coeffs.msy.toFixed(4)}`,
      explanation: "Coefficients interpolated for exact span ratio"
    });

    // Step 5: Design Moments
    shortSpanMoment = coeffs.msx * ultimateLoad * Math.pow(input.shortSpan, 2);
    longSpanMoment = coeffs.msy * ultimateLoad * Math.pow(input.shortSpan, 2);
    
    steps.push({
      title: "Step 5: Design Moments (Two-Way Slab)",
      formula: "Msx = βsx × n × lx², Msy = βsy × n × lx²",
      substitution: `Msx = ${coeffs.msx.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²\nMsy = ${coeffs.msy.toFixed(4)} × ${ultimateLoad.toFixed(2)} × ${input.shortSpan}²`,
      result: `Msx = ${shortSpanMoment.toFixed(2)} kNm/m\nMsy = ${longSpanMoment.toFixed(2)} kNm/m`
    });

    // Step 6: K-value Check (Short Span)
    const M_short_Nmm = shortSpanMoment * 1e6;
    const K_short = M_short_Nmm / (1000 * Math.pow(effectiveDepthShort, 2) * input.fcu);
    
    steps.push({
      title: "Step 6: K-value Check - Short Span",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${shortSpanMoment.toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthShort.toFixed(0)}² × ${input.fcu})`,
      result: `Ksx = ${K_short.toFixed(4)}`,
      isCheck: true,
      checkPassed: K_short <= K_prime,
      explanation: K_short <= K_prime 
        ? `K = ${K_short.toFixed(4)} < K' = ${K_prime} → OK`
        : `K > K' → Increase depth`
    });

    if (K_short > K_prime) designValid = false;

    // Step 7: Lever Arm - Short Span
    const z_short = Math.min(effectiveDepthShort * (0.5 + Math.sqrt(0.25 - K_short / 0.9)), 0.95 * effectiveDepthShort);
    
    steps.push({
      title: "Step 7: Lever Arm - Short Span",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      result: `zsx = ${z_short.toFixed(1)} mm`
    });

    // Step 8: Reinforcement - Short Span
    shortSpanSteel = M_short_Nmm / (0.87 * input.fy * z_short);
    
    steps.push({
      title: "Step 8: Reinforcement - Short Span",
      formula: "Asx = Msx / (0.87fy × z)",
      substitution: `Asx = ${shortSpanMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z_short.toFixed(1)})`,
      result: `Asx = ${shortSpanSteel.toFixed(0)} mm²/m`
    });

    // Step 9: K-value Check (Long Span)
    const M_long_Nmm = longSpanMoment * 1e6;
    const K_long = M_long_Nmm / (1000 * Math.pow(effectiveDepthLong, 2) * input.fcu);
    
    steps.push({
      title: "Step 9: K-value Check - Long Span",
      formula: "K = M / (bd²fcu)",
      substitution: `K = ${longSpanMoment.toFixed(2)} × 10⁶ / (1000 × ${effectiveDepthLong.toFixed(0)}² × ${input.fcu})`,
      result: `Ksy = ${K_long.toFixed(4)}`,
      isCheck: true,
      checkPassed: K_long <= K_prime,
    });

    if (K_long > K_prime) designValid = false;

    // Step 10: Lever Arm - Long Span
    const z_long = Math.min(effectiveDepthLong * (0.5 + Math.sqrt(0.25 - K_long / 0.9)), 0.95 * effectiveDepthLong);
    
    steps.push({
      title: "Step 10: Lever Arm - Long Span",
      formula: "z = d(0.5 + √(0.25 - K/0.9)) ≤ 0.95d",
      result: `zsy = ${z_long.toFixed(1)} mm`
    });

    // Step 11: Reinforcement - Long Span
    longSpanSteel = M_long_Nmm / (0.87 * input.fy * z_long);
    
    steps.push({
      title: "Step 11: Reinforcement - Long Span",
      formula: "Asy = Msy / (0.87fy × z)",
      substitution: `Asy = ${longSpanMoment.toFixed(2)} × 10⁶ / (0.87 × ${input.fy} × ${z_long.toFixed(1)})`,
      result: `Asy = ${longSpanSteel.toFixed(0)} mm²/m`
    });

    // Step 12: Minimum Steel Check
    const minSteel = 0.0013 * 1000 * input.slabThickness;
    const shortOK = shortSpanSteel >= minSteel;
    const longOK = longSpanSteel >= minSteel;
    
    steps.push({
      title: "Step 12: Minimum Steel Check",
      formula: "As,min = 0.13%bh",
      substitution: `As,min = 0.0013 × 1000 × ${input.slabThickness}`,
      result: `As,min = ${minSteel.toFixed(0)} mm²/m`,
      isCheck: true,
      checkPassed: shortOK && longOK,
      explanation: `Short span: ${shortOK ? '✓' : 'Use min'}, Long span: ${longOK ? '✓' : 'Use min'}`
    });

    shortSpanSteel = Math.max(shortSpanSteel, minSteel);
    longSpanSteel = Math.max(longSpanSteel, minSteel);

    // Step 13: Provide reinforcement
    const shortBars = suggestBars(shortSpanSteel);
    const longBars = suggestBars(longSpanSteel);
    
    steps.push({
      title: "Step 13: Reinforcement Provision",
      result: `Short Span (Bottom Layer): ${shortBars}\nLong Span (Top Layer): ${longBars}`,
      explanation: "Short span bars placed as bottom layer for greater effective depth"
    });
  }

  return {
    steps,
    summary: {
      slabType: actualSlabType === 'one-way' ? 'One-Way Slab' : 'Two-Way Slab',
      ultimateLoad,
      shortSpanMoment,
      longSpanMoment,
      shortSpanSteel,
      longSpanSteel,
      effectiveDepthShort,
      effectiveDepthLong: actualSlabType === 'two-way' ? effectiveDepthLong : undefined,
      designValid,
      spanRatio: actualSlabType === 'two-way' ? spanRatio : undefined
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
