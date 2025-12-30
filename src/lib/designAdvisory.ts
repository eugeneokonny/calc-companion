// Design Advisory System
// Provides actionable feedback when designs fail

export interface DesignFailure {
  type: 'moment' | 'shear' | 'deflection' | 'reinforcement' | 'k-value' | 'general';
  description: string;
  currentValue: number;
  limitValue: number;
  unit: string;
}

export interface DesignAdvice {
  priority: number;
  action: string;
  reason: string;
  effectiveness: 'high' | 'medium' | 'low';
  category: 'geometry' | 'material' | 'layout' | 'reinforcement';
}

export interface AdvisoryResult {
  overallStatus: 'passed' | 'failed';
  failures: DesignFailure[];
  advice: DesignAdvice[];
}

// Analyze beam design and provide advice
export function analyzeBeamDesign(params: {
  kValue: number;
  kPrime: number;
  shearStress: number;
  maxShearStress: number;
  actualSpanDepthRatio: number;
  allowableSpanDepthRatio: number;
  tensionSteel: number;
  width: number;
  depth: number;
  effectiveDepth: number;
  span: number;
  fcu: number;
  fy: number;
}): AdvisoryResult {
  const failures: DesignFailure[] = [];
  const advice: DesignAdvice[] = [];

  // Check K-value (moment capacity)
  if (params.kValue > params.kPrime) {
    failures.push({
      type: 'k-value',
      description: 'K-value exceeds K\' limit - section inadequate for bending',
      currentValue: params.kValue,
      limitValue: params.kPrime,
      unit: ''
    });

    const depthIncrease = Math.ceil(params.depth * Math.sqrt(params.kValue / params.kPrime) * 1.1);
    advice.push({
      priority: 1,
      action: `Increase beam depth from ${params.depth}mm to ${Math.ceil(depthIncrease / 25) * 25}mm`,
      reason: `Current K = ${params.kValue.toFixed(4)} exceeds K' = ${params.kPrime}. Deeper section reduces K value.`,
      effectiveness: 'high',
      category: 'geometry'
    });

    advice.push({
      priority: 2,
      action: `Increase beam width from ${params.width}mm to ${Math.ceil(params.width * 1.3 / 25) * 25}mm`,
      reason: 'Wider section provides more moment resistance without changing depth',
      effectiveness: 'medium',
      category: 'geometry'
    });

    if (params.fcu < 40) {
      advice.push({
        priority: 4,
        action: `Increase concrete grade from C${params.fcu} to C${Math.min(params.fcu + 10, 50)}`,
        reason: 'Higher concrete strength increases moment capacity',
        effectiveness: 'medium',
        category: 'material'
      });
    }
  }

  // Check shear stress
  if (params.shearStress > params.maxShearStress) {
    failures.push({
      type: 'shear',
      description: 'Shear stress exceeds maximum permissible value',
      currentValue: params.shearStress,
      limitValue: params.maxShearStress,
      unit: 'N/mm²'
    });

    const widthIncrease = Math.ceil(params.width * (params.shearStress / params.maxShearStress) * 1.1);
    advice.push({
      priority: 1,
      action: `Increase beam width from ${params.width}mm to ${Math.ceil(widthIncrease / 25) * 25}mm`,
      reason: `Shear stress ${params.shearStress.toFixed(2)} N/mm² exceeds limit ${params.maxShearStress.toFixed(2)} N/mm²`,
      effectiveness: 'high',
      category: 'geometry'
    });

    advice.push({
      priority: 2,
      action: `Increase beam depth to reduce shear stress`,
      reason: 'Larger cross-section area reduces shear stress',
      effectiveness: 'high',
      category: 'geometry'
    });
  }

  // Check deflection
  if (params.actualSpanDepthRatio > params.allowableSpanDepthRatio) {
    failures.push({
      type: 'deflection',
      description: 'Span/depth ratio exceeds allowable limit',
      currentValue: params.actualSpanDepthRatio,
      limitValue: params.allowableSpanDepthRatio,
      unit: ''
    });

    const requiredDepth = Math.ceil((params.span * 1000) / params.allowableSpanDepthRatio);
    advice.push({
      priority: 1,
      action: `Increase effective depth from ${params.effectiveDepth}mm to ${Math.ceil(requiredDepth / 25) * 25}mm`,
      reason: `Actual span/d = ${params.actualSpanDepthRatio.toFixed(1)} exceeds allowable ${params.allowableSpanDepthRatio.toFixed(1)}`,
      effectiveness: 'high',
      category: 'geometry'
    });

    advice.push({
      priority: 3,
      action: 'Add compression reinforcement to increase stiffness',
      reason: 'Compression steel increases the tension modification factor',
      effectiveness: 'medium',
      category: 'reinforcement'
    });

    if (params.span > 6) {
      advice.push({
        priority: 4,
        action: `Consider reducing span from ${params.span}m by adding intermediate support`,
        reason: 'Shorter spans significantly reduce deflection requirements',
        effectiveness: 'high',
        category: 'layout'
      });
    }
  }

  // Check reinforcement limits
  const maxSteelRatio = 0.04 * params.width * params.effectiveDepth;
  if (params.tensionSteel > maxSteelRatio) {
    failures.push({
      type: 'reinforcement',
      description: 'Required reinforcement exceeds maximum practical limits',
      currentValue: params.tensionSteel,
      limitValue: maxSteelRatio,
      unit: 'mm²'
    });

    advice.push({
      priority: 1,
      action: `Increase beam dimensions to reduce steel requirement`,
      reason: `Steel area ${params.tensionSteel.toFixed(0)} mm² exceeds practical limit`,
      effectiveness: 'high',
      category: 'geometry'
    });

    if (params.fy < 500) {
      advice.push({
        priority: 3,
        action: `Consider using higher grade steel (Grade 500)`,
        reason: 'Higher strength steel reduces required area',
        effectiveness: 'low',
        category: 'material'
      });
    }
  }

  // Remove duplicates and sort by priority
  const uniqueAdvice = advice.reduce((acc, curr) => {
    if (!acc.find(a => a.action === curr.action)) {
      acc.push(curr);
    }
    return acc;
  }, [] as DesignAdvice[]);

  return {
    overallStatus: failures.length === 0 ? 'passed' : 'failed',
    failures,
    advice: uniqueAdvice.sort((a, b) => a.priority - b.priority).slice(0, 6)
  };
}

// Analyze slab design and provide advice
export function analyzeSlabDesign(params: {
  kValue: number;
  kPrime: number;
  shearStress: number;
  permissibleShear: number;
  actualSpanDepthRatio: number;
  allowableSpanDepthRatio: number;
  thickness: number;
  shortSpan: number;
  longSpan: number;
  fcu: number;
  slabType: 'one-way' | 'two-way';
}): AdvisoryResult {
  const failures: DesignFailure[] = [];
  const advice: DesignAdvice[] = [];

  // Check K-value
  if (params.kValue > params.kPrime) {
    failures.push({
      type: 'k-value',
      description: 'K-value exceeds limit - slab too thin for applied moment',
      currentValue: params.kValue,
      limitValue: params.kPrime,
      unit: ''
    });

    const thicknessIncrease = Math.ceil(params.thickness * Math.sqrt(params.kValue / params.kPrime) * 1.15);
    advice.push({
      priority: 1,
      action: `Increase slab thickness from ${params.thickness}mm to ${Math.ceil(thicknessIncrease / 25) * 25}mm`,
      reason: `K = ${params.kValue.toFixed(4)} exceeds K' = ${params.kPrime}`,
      effectiveness: 'high',
      category: 'geometry'
    });

    if (params.fcu < 35) {
      advice.push({
        priority: 3,
        action: `Increase concrete grade from C${params.fcu} to C${Math.min(params.fcu + 5, 40)}`,
        reason: 'Higher concrete strength increases moment capacity',
        effectiveness: 'medium',
        category: 'material'
      });
    }
  }

  // Check shear
  if (params.shearStress > params.permissibleShear) {
    failures.push({
      type: 'shear',
      description: 'Shear stress exceeds permissible limit',
      currentValue: params.shearStress,
      limitValue: params.permissibleShear,
      unit: 'N/mm²'
    });

    advice.push({
      priority: 1,
      action: `Increase slab thickness from ${params.thickness}mm to ${Math.ceil(params.thickness * 1.2 / 25) * 25}mm`,
      reason: `v = ${params.shearStress.toFixed(3)} N/mm² exceeds vc = ${params.permissibleShear.toFixed(3)} N/mm²`,
      effectiveness: 'high',
      category: 'geometry'
    });

    advice.push({
      priority: 4,
      action: 'Consider providing drop panels at columns',
      reason: 'Drop panels increase shear capacity at critical locations',
      effectiveness: 'high',
      category: 'layout'
    });
  }

  // Check deflection
  if (params.actualSpanDepthRatio > params.allowableSpanDepthRatio) {
    failures.push({
      type: 'deflection',
      description: 'Span/depth ratio exceeds limit',
      currentValue: params.actualSpanDepthRatio,
      limitValue: params.allowableSpanDepthRatio,
      unit: ''
    });

    advice.push({
      priority: 1,
      action: `Increase slab thickness from ${params.thickness}mm to ${Math.ceil(params.thickness * 1.25 / 25) * 25}mm`,
      reason: `Span/d = ${params.actualSpanDepthRatio.toFixed(1)} exceeds allowable ${params.allowableSpanDepthRatio.toFixed(1)}`,
      effectiveness: 'high',
      category: 'geometry'
    });

    if (params.slabType === 'one-way' && params.longSpan / params.shortSpan > 1.5) {
      advice.push({
        priority: 2,
        action: 'Consider two-way slab design by adding edge beams',
        reason: 'Two-way action distributes load more efficiently',
        effectiveness: 'high',
        category: 'layout'
      });
    }

    advice.push({
      priority: 3,
      action: 'Reduce panel size by adding supporting beams',
      reason: 'Shorter spans reduce deflection requirements',
      effectiveness: 'high',
      category: 'layout'
    });
  }

  return {
    overallStatus: failures.length === 0 ? 'passed' : 'failed',
    failures,
    advice: advice.sort((a, b) => a.priority - b.priority).slice(0, 5)
  };
}
