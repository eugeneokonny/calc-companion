// Continuous Beam Design Module - BS 8110
// This module EXTENDS the existing MVP without replacing any functionality

export interface ContinuousBeamSpan {
  length: number; // m
  deadLoad: number; // kN/m
  liveLoad: number; // kN/m
}

export interface ContinuousBeamInput {
  spans: ContinuousBeamSpan[];
  fcu: number; // N/mm²
  fy: number; // N/mm²
  width: number; // mm
  effectiveDepth: number; // mm
  cover: number; // mm
  includeSelfWeight: boolean;
  beamDepth: number; // mm (for self-weight)
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

export interface SpanResult {
  spanIndex: number;
  length: number;
  ultimateLoad: number;
  positiveMoment: number;
  negativeMomentLeft: number;
  negativeMomentRight: number;
  shearLeft: number;
  shearRight: number;
  tensionSteel: number;
  compressionSteel: number;
  linkSize: number;
  linkSpacing: number;
  topSteel?: string;
  bottomSteel?: string;
}

export interface ContinuousBeamResult {
  steps: CalculationStep[];
  spanResults: SpanResult[];
  summary: {
    numberOfSpans: number;
    maxPositiveMoment: number;
    maxNegativeMoment: number;
    maxShear: number;
    maxTensionSteel: number;
    maxCompressionSteel: number;
    designValid: boolean;
    shearStatus: 'safe' | 'unsafe';
    deflectionStatus: 'safe' | 'unsafe';
    failureReasons?: string[];
    suggestions?: DesignSuggestion[];
    // Extended properties for BS 8110 output
    ultimateLoad?: number;
    deadLoad?: number;
    liveLoad?: number;
    width?: number;
    effectiveDepth?: number;
    fcu?: number;
    fy?: number;
    kValue?: number;
    leverArm?: number;
    shearStress?: number;
    vc?: number;
    actualSpanDepthRatio?: number;
    basicSpanDepthRatio?: number;
    modificationFactor?: number;
    allowableSpanDepthRatio?: number;
    barSuggestion?: string;
  };
}

export interface DesignSuggestion {
  priority: number;
  action: string;
  reason: string;
  effectiveness: 'high' | 'medium' | 'low';
}

// BS8110 Table 3.5 - Moment coefficients for continuous beams (uniform loads, equal spans)
const continuousMomentCoefficients = {
  2: {
    support: [-0, -0.125, -0],
    midspan: [0.070, 0.070]
  },
  3: {
    support: [-0, -0.100, -0.100, -0],
    midspan: [0.080, 0.025, 0.080]
  },
  4: {
    support: [-0, -0.107, -0.071, -0.107, -0],
    midspan: [0.077, 0.036, 0.036, 0.077]
  },
  5: {
    support: [-0, -0.105, -0.079, -0.079, -0.105, -0],
    midspan: [0.078, 0.033, 0.046, 0.033, 0.078]
  }
};

// BS8110 Table 3.5 - Shear coefficients for continuous beams
const continuousShearCoefficients = {
  2: {
    left: [0.375, 0.625],
    right: [0.625, 0.375]
  },
  3: {
    left: [0.400, 0.500, 0.600],
    right: [0.600, 0.500, 0.400]
  },
  4: {
    left: [0.393, 0.536, 0.464, 0.607],
    right: [0.607, 0.464, 0.536, 0.393]
  },
  5: {
    left: [0.395, 0.526, 0.500, 0.474, 0.605],
    right: [0.605, 0.474, 0.500, 0.526, 0.395]
  }
};

// Calculate permissible shear stress vc (BS8110 Table 3.8)
function calculateVc(As: number, b: number, d: number, fcu: number): number {
  const ratio = Math.min((100 * As) / (b * d), 3);
  const depthFactor = Math.pow(400 / d, 0.25);
  const fcuFactor = Math.pow(fcu / 25, 1/3);
  return (0.79 * Math.pow(ratio, 1/3) * Math.max(depthFactor, 0.67) * Math.min(fcuFactor, 1.0)) / 1.25;
}

// Calculate link spacing requirements
function calculateLinkSpacing(v: number, vc: number, b: number, d: number, fy: number): { size: number; spacing: number } {
  const vShear = v - vc;
  if (vShear <= 0) {
    return { size: 8, spacing: Math.min(300, Math.floor(0.75 * d)) };
  }
  
  const AsvOverSv = (b * vShear) / (0.87 * fy);
  const linkSizes = [8, 10, 12];
  
  for (const dia of linkSizes) {
    const Asv = 2 * Math.PI * Math.pow(dia / 2, 2);
    const spacing = Math.floor(Asv / AsvOverSv);
    if (spacing >= 75 && spacing <= 0.75 * d) {
      return { size: dia, spacing: Math.min(spacing, Math.floor(0.75 * d)) };
    }
  }
  
  return { size: 12, spacing: 100 };
}

// Bar selection helper
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
    if (count <= 5) {
      return `${count}T${bar.dia} (${(count * bar.area).toFixed(0)} mm²)`;
    }
  }
  return "Use 2 layers or larger bars";
}

// Generate design suggestions when design fails
export function generateDesignSuggestions(
  failures: { type: string; value: number; limit: number }[],
  input: ContinuousBeamInput
): DesignSuggestion[] {
  const suggestions: DesignSuggestion[] = [];
  
  for (const failure of failures) {
    switch (failure.type) {
      case 'moment':
        suggestions.push({
          priority: 1,
          action: `Increase beam depth from ${input.beamDepth}mm to ${Math.ceil(input.beamDepth * 1.2 / 25) * 25}mm`,
          reason: `Moment capacity exceeded by ${((failure.value / failure.limit - 1) * 100).toFixed(0)}%`,
          effectiveness: 'high'
        });
        suggestions.push({
          priority: 2,
          action: `Increase beam width from ${input.width}mm to ${Math.ceil(input.width * 1.15 / 25) * 25}mm`,
          reason: 'Wider section provides more moment resistance',
          effectiveness: 'medium'
        });
        suggestions.push({
          priority: 4,
          action: `Increase concrete grade from C${input.fcu} to C${Math.min(input.fcu + 10, 50)}`,
          reason: 'Higher concrete strength increases moment capacity',
          effectiveness: 'medium'
        });
        break;
        
      case 'shear':
        suggestions.push({
          priority: 1,
          action: `Increase beam depth from ${input.beamDepth}mm to ${Math.ceil(input.beamDepth * 1.15 / 25) * 25}mm`,
          reason: `Shear stress ${failure.value.toFixed(2)} N/mm² exceeds limit ${failure.limit.toFixed(2)} N/mm²`,
          effectiveness: 'high'
        });
        suggestions.push({
          priority: 2,
          action: `Increase beam width from ${input.width}mm to ${Math.ceil(input.width * 1.2 / 25) * 25}mm`,
          reason: 'Wider section reduces shear stress',
          effectiveness: 'high'
        });
        break;
        
      case 'deflection':
        suggestions.push({
          priority: 1,
          action: `Increase beam depth from ${input.beamDepth}mm to ${Math.ceil(input.beamDepth * 1.25 / 25) * 25}mm`,
          reason: `Span/depth ratio exceeded by ${((failure.value / failure.limit - 1) * 100).toFixed(0)}%`,
          effectiveness: 'high'
        });
        suggestions.push({
          priority: 3,
          action: 'Add compression reinforcement to increase stiffness',
          reason: 'Compression steel increases allowable span/depth ratio',
          effectiveness: 'medium'
        });
        break;
        
      case 'reinforcement':
        suggestions.push({
          priority: 1,
          action: `Increase beam depth from ${input.beamDepth}mm to ${Math.ceil(input.beamDepth * 1.3 / 25) * 25}mm`,
          reason: 'Required steel exceeds practical limits - deeper section reduces steel requirement',
          effectiveness: 'high'
        });
        suggestions.push({
          priority: 2,
          action: `Increase concrete grade from C${input.fcu} to C${Math.min(input.fcu + 10, 50)}`,
          reason: 'Higher concrete grade allows higher K value',
          effectiveness: 'medium'
        });
        suggestions.push({
          priority: 5,
          action: 'Reduce span by adding intermediate support',
          reason: 'Shorter spans significantly reduce moments',
          effectiveness: 'high'
        });
        break;
    }
  }
  
  // Sort by priority and remove duplicates
  const uniqueSuggestions = suggestions.reduce((acc, curr) => {
    if (!acc.find(s => s.action === curr.action)) {
      acc.push(curr);
    }
    return acc;
  }, [] as DesignSuggestion[]);
  
  return uniqueSuggestions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export function calculateContinuousBeamDesign(input: ContinuousBeamInput): ContinuousBeamResult {
  const steps: CalculationStep[] = [];
  const spanResults: SpanResult[] = [];
  const numSpans = input.spans.length;
  const failures: { type: string; value: number; limit: number }[] = [];
  
  const gamma_dead = 1.4;
  const gamma_live = 1.6;
  const K_prime = 0.156;
  
  // Validate number of spans
  if (numSpans < 2 || numSpans > 5) {
    steps.push({
      title: "Error",
      result: `Continuous beam analysis supports 2-5 spans. You entered ${numSpans} spans.`,
      status: 'unsafe'
    });
    return {
      steps,
      spanResults: [],
      summary: {
        numberOfSpans: numSpans,
        maxPositiveMoment: 0,
        maxNegativeMoment: 0,
        maxShear: 0,
        maxTensionSteel: 0,
        maxCompressionSteel: 0,
        designValid: false,
        shearStatus: 'unsafe',
        deflectionStatus: 'unsafe',
        failureReasons: ['Invalid number of spans']
      }
    };
  }

  // Step 1: Beam Declaration
  steps.push({
    title: "CONTINUOUS BEAM DECLARATION",
    result: `Number of Spans: ${numSpans}
Beam Section: ${input.width}mm × ${input.beamDepth}mm
Effective Depth: ${input.effectiveDepth}mm
Concrete: C${input.fcu}, Steel: Grade ${input.fy}`,
    explanation: "Design in accordance with BS 8110-1:1997 Table 3.5",
    bsReference: "BS8110 Table 3.5",
    status: 'safe'
  });

  // Step 2: Calculate ultimate loads for each span
  const ultimateLoads: number[] = [];
  let selfWeight = 0;
  
  if (input.includeSelfWeight) {
    // Concrete density ≈ 25 kN/m³
    selfWeight = (input.width / 1000) * (input.beamDepth / 1000) * 25;
  }

  steps.push({
    title: "Step 1: Ultimate Design Loads",
    formula: "w = 1.4(Gk + SW) + 1.6Qk",
    substitution: input.spans.map((span, i) => {
      const totalDead = span.deadLoad + (input.includeSelfWeight ? selfWeight : 0);
      const ultimateLoad = gamma_dead * totalDead + gamma_live * span.liveLoad;
      ultimateLoads.push(ultimateLoad);
      return `Span ${i + 1}: w = 1.4 × (${span.deadLoad} + ${selfWeight.toFixed(2)}) + 1.6 × ${span.liveLoad} = ${ultimateLoad.toFixed(2)} kN/m`;
    }).join('\n'),
    result: `Self-weight: ${selfWeight.toFixed(2)} kN/m
Ultimate loads calculated for all spans`,
    bsReference: "BS8110 Cl. 2.4.3"
  });

  // Get coefficients for this number of spans
  const momentCoeffs = continuousMomentCoefficients[numSpans as keyof typeof continuousMomentCoefficients];
  const shearCoeffs = continuousShearCoefficients[numSpans as keyof typeof continuousShearCoefficients];
  
  // Use average span for coefficient-based design
  const avgSpan = input.spans.reduce((sum, s) => sum + s.length, 0) / numSpans;
  const avgLoad = ultimateLoads.reduce((sum, w) => sum + w, 0) / numSpans;

  // Step 3: Calculate support moments
  const supportMoments: number[] = momentCoeffs.support.map((coeff, i) => {
    return Math.abs(coeff) * avgLoad * avgSpan * avgSpan;
  });

  steps.push({
    title: "Step 2: Support Moments",
    formula: "M = β × w × L²",
    substitution: `Using BS8110 Table 3.5 coefficients for ${numSpans}-span beam:
${momentCoeffs.support.map((coeff, i) => 
  `Support ${i}: β = ${coeff.toFixed(3)}, M = ${Math.abs(coeff).toFixed(3)} × ${avgLoad.toFixed(2)} × ${avgSpan.toFixed(2)}²`
).join('\n')}`,
    result: `Support Moments:
${supportMoments.map((m, i) => `  Support ${i}: ${m.toFixed(2)} kNm`).join('\n')}`,
    bsReference: "BS8110 Table 3.5"
  });

  // Step 4: Calculate span moments
  const spanMoments: number[] = momentCoeffs.midspan.map((coeff, i) => {
    return coeff * avgLoad * avgSpan * avgSpan;
  });

  steps.push({
    title: "Step 3: Span Moments",
    formula: "M = β × w × L²",
    substitution: `${momentCoeffs.midspan.map((coeff, i) => 
      `Span ${i + 1}: β = ${coeff.toFixed(3)}, M = ${coeff.toFixed(3)} × ${avgLoad.toFixed(2)} × ${avgSpan.toFixed(2)}²`
    ).join('\n')}`,
    result: `Mid-span Moments:
${spanMoments.map((m, i) => `  Span ${i + 1}: ${m.toFixed(2)} kNm`).join('\n')}`
  });

  // Step 5: Calculate shear forces
  const shearForces: { left: number; right: number }[] = [];
  for (let i = 0; i < numSpans; i++) {
    const span = input.spans[i];
    const w = ultimateLoads[i];
    shearForces.push({
      left: shearCoeffs.left[i] * w * span.length,
      right: shearCoeffs.right[i] * w * span.length
    });
  }

  steps.push({
    title: "Step 4: Shear Forces",
    formula: "V = β × w × L",
    result: `Shear Forces:
${shearForces.map((sf, i) => 
  `  Span ${i + 1}: Left = ${sf.left.toFixed(2)} kN, Right = ${sf.right.toFixed(2)} kN`
).join('\n')}`,
    bsReference: "BS8110 Table 3.5"
  });

  // Step 6: Check maximum moment K-value
  const maxMoment = Math.max(...spanMoments, ...supportMoments.filter(m => m > 0));
  const M_Nmm = maxMoment * 1e6;
  const K = M_Nmm / (input.width * Math.pow(input.effectiveDepth, 2) * input.fcu);
  
  const momentOK = K <= K_prime;
  if (!momentOK) {
    failures.push({ type: 'moment', value: K, limit: K_prime });
  }

  steps.push({
    title: "Step 5: Critical Moment Check",
    formula: "K = M / (bd²fcu) ≤ K' = 0.156",
    substitution: `Max moment = ${maxMoment.toFixed(2)} kNm
K = ${maxMoment.toFixed(2)} × 10⁶ / (${input.width} × ${input.effectiveDepth}² × ${input.fcu})`,
    result: `K = ${K.toFixed(4)}`,
    isCheck: true,
    checkPassed: momentOK,
    status: momentOK ? 'safe' : 'unsafe',
    explanation: momentOK 
      ? `K ≤ K' → Singly reinforced section adequate ✓`
      : `K > K' → Section dimensions inadequate for singly reinforced design`,
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // Step 7: Calculate reinforcement for each span
  let maxTensionSteel = 0;
  let maxCompressionSteel = 0;

  for (let i = 0; i < numSpans; i++) {
    const span = input.spans[i];
    const posM = spanMoments[i];
    const negMLeft = supportMoments[i];
    const negMRight = supportMoments[i + 1];
    
    // Calculate required steel for positive moment
    const posM_Nmm = posM * 1e6;
    const K_pos = posM_Nmm / (input.width * Math.pow(input.effectiveDepth, 2) * input.fcu);
    const z_pos = Math.min(input.effectiveDepth * (0.5 + Math.sqrt(0.25 - Math.min(K_pos, K_prime) / 0.9)), 0.95 * input.effectiveDepth);
    const As_pos = posM_Nmm / (0.87 * input.fy * z_pos);
    
    // Calculate required steel for maximum negative moment
    const maxNegM = Math.max(negMLeft, negMRight);
    const negM_Nmm = maxNegM * 1e6;
    const K_neg = negM_Nmm / (input.width * Math.pow(input.effectiveDepth, 2) * input.fcu);
    const z_neg = Math.min(input.effectiveDepth * (0.5 + Math.sqrt(0.25 - Math.min(K_neg, K_prime) / 0.9)), 0.95 * input.effectiveDepth);
    const As_neg = negM_Nmm > 0 ? negM_Nmm / (0.87 * input.fy * z_neg) : 0;
    
    // Minimum steel
    const minSteel = 0.0013 * input.width * input.effectiveDepth;
    const finalAs = Math.max(As_pos, As_neg, minSteel);
    
    // Shear design
    const maxShear = Math.max(shearForces[i].left, shearForces[i].right);
    const shearStress = (maxShear * 1000) / (input.width * input.effectiveDepth);
    const vc = calculateVc(finalAs, input.width, input.effectiveDepth, input.fcu);
    const links = calculateLinkSpacing(shearStress, vc, input.width, input.effectiveDepth, input.fy);
    
    spanResults.push({
      spanIndex: i + 1,
      length: span.length,
      ultimateLoad: ultimateLoads[i],
      positiveMoment: posM,
      negativeMomentLeft: negMLeft,
      negativeMomentRight: negMRight,
      shearLeft: shearForces[i].left,
      shearRight: shearForces[i].right,
      tensionSteel: finalAs,
      compressionSteel: K_pos > K_prime ? finalAs * 0.3 : 0,
      linkSize: links.size,
      linkSpacing: links.spacing,
      topSteel: suggestBars(As_neg > 0 ? As_neg : minSteel),
      bottomSteel: suggestBars(As_pos > minSteel ? As_pos : minSteel)
    });
    
    maxTensionSteel = Math.max(maxTensionSteel, finalAs);
    maxCompressionSteel = Math.max(maxCompressionSteel, K_pos > K_prime ? finalAs * 0.3 : 0);
  }

  steps.push({
    title: "Step 6: Reinforcement Design",
    result: spanResults.map(sr => 
      `Span ${sr.spanIndex}: As = ${sr.tensionSteel.toFixed(0)} mm² → ${suggestBars(sr.tensionSteel)}
  Links: T${sr.linkSize}@${sr.linkSpacing}mm c/c`
    ).join('\n\n'),
    bsReference: "BS8110 Cl. 3.4.4.4"
  });

  // Step 8: Shear check
  const maxShear = Math.max(...shearForces.flatMap(sf => [sf.left, sf.right]));
  const maxShearStress = (maxShear * 1000) / (input.width * input.effectiveDepth);
  const maxVc = Math.min(0.8 * Math.sqrt(input.fcu), 5);
  const shearOK = maxShearStress < maxVc;
  
  if (!shearOK) {
    failures.push({ type: 'shear', value: maxShearStress, limit: maxVc });
  }

  steps.push({
    title: "Step 7: Shear Verification",
    formula: "v = V / (bd) < 0.8√fcu or 5 N/mm²",
    substitution: `Maximum shear = ${maxShear.toFixed(2)} kN
v = ${(maxShear * 1000).toFixed(0)} / (${input.width} × ${input.effectiveDepth})`,
    result: `v = ${maxShearStress.toFixed(2)} N/mm²
vmax = ${maxVc.toFixed(2)} N/mm²`,
    isCheck: true,
    checkPassed: shearOK,
    status: shearOK ? 'safe' : 'unsafe',
    bsReference: "BS8110 Cl. 3.4.5"
  });

  // Step 9: Deflection check
  const basicRatio = 26; // Continuous beam
  const tensionMod = 1.3; // Conservative estimate
  const allowableRatio = basicRatio * tensionMod;
  const actualRatio = (avgSpan * 1000) / input.effectiveDepth;
  const deflectionOK = actualRatio <= allowableRatio;
  
  if (!deflectionOK) {
    failures.push({ type: 'deflection', value: actualRatio, limit: allowableRatio });
  }

  steps.push({
    title: "Step 8: Deflection Check",
    formula: "Actual span/d ≤ Basic ratio × Modification factor",
    substitution: `Basic ratio = ${basicRatio} (continuous beam)
Modification factor ≈ ${tensionMod.toFixed(2)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
    result: `Actual span/d = ${actualRatio.toFixed(1)}
Allowable span/d = ${allowableRatio.toFixed(1)}`,
    isCheck: true,
    checkPassed: deflectionOK,
    status: deflectionOK ? 'safe' : 'unsafe',
    explanation: deflectionOK 
      ? `Actual ≤ Allowable → Deflection satisfactory ✓` 
      : `Actual > Allowable → Increase beam depth`,
    bsReference: "BS8110 Cl. 3.4.6"
  });

  // Step 10: Final reinforcement summary
  steps.push({
    title: "Step 9: Reinforcement Summary",
    result: `Maximum Tension Steel: ${maxTensionSteel.toFixed(0)} mm² → ${suggestBars(maxTensionSteel)}
${maxCompressionSteel > 0 ? `Maximum Compression Steel: ${maxCompressionSteel.toFixed(0)} mm² → ${suggestBars(maxCompressionSteel)}` : 'No compression steel required'}
Shear Links: See individual span results above`,
    bsReference: "BS8110 Cl. 3.12"
  });

  const designValid = momentOK && shearOK && deflectionOK;
  const suggestions = !designValid ? generateDesignSuggestions(failures, input) : undefined;
  const failureReasons = failures.map(f => {
    switch (f.type) {
      case 'moment': return 'Excessive bending moment - K value exceeds limit';
      case 'shear': return 'Excessive shear stress exceeds maximum permissible';
      case 'deflection': return 'Deflection limit exceeded - span/depth ratio too high';
      case 'reinforcement': return 'Required reinforcement exceeds practical limits';
      default: return 'Design check failed';
    }
  });

  // Calculate vc for summary
  const vcSummary = calculateVc(maxTensionSteel, input.width, input.effectiveDepth, input.fcu);
  const leverArm = Math.min(input.effectiveDepth * (0.5 + Math.sqrt(0.25 - Math.min(K, K_prime) / 0.9)), 0.95 * input.effectiveDepth);

  return {
    steps,
    spanResults,
    summary: {
      numberOfSpans: numSpans,
      maxPositiveMoment: Math.max(...spanMoments),
      maxNegativeMoment: Math.max(...supportMoments),
      maxShear,
      maxTensionSteel,
      maxCompressionSteel,
      designValid,
      shearStatus: shearOK ? 'safe' : 'unsafe',
      deflectionStatus: deflectionOK ? 'safe' : 'unsafe',
      failureReasons: !designValid ? failureReasons : undefined,
      suggestions,
      // Extended BS 8110 output properties
      ultimateLoad: avgLoad,
      deadLoad: input.spans[0]?.deadLoad || 0,
      liveLoad: input.spans[0]?.liveLoad || 0,
      width: input.width,
      effectiveDepth: input.effectiveDepth,
      fcu: input.fcu,
      fy: input.fy,
      kValue: K,
      leverArm,
      shearStress: maxShearStress,
      vc: vcSummary,
      actualSpanDepthRatio: actualRatio,
      basicSpanDepthRatio: basicRatio,
      modificationFactor: tensionMod,
      allowableSpanDepthRatio: allowableRatio,
      barSuggestion: suggestBars(maxTensionSteel)
    }
  };
}
