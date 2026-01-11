// BS 8110-1:1997 Column Design Calculations
// This module provides comprehensive axially loaded and short braced column design

export interface ColumnInputs {
  // Geometry
  columnHeight: number; // mm
  columnWidth: number; // b (mm)
  columnDepth: number; // h (mm)
  effectiveLength: number; // le (mm)
  
  // Loading
  deadLoad: number; // Gk (kN)
  liveLoad: number; // Qk (kN)
  deadLoadMoment: number; // Mgk (kNm)
  liveLoadMoment: number; // Mqk (kNm)
  
  // Material Properties
  concreteGrade: number; // fcu (N/mm²)
  steelGrade: number; // fy (N/mm²)
  
  // Reinforcement Details
  cover: number; // mm
  mainBarDiameter: number; // mm
  linkDiameter: number; // mm
}

export interface CalculationStep {
  stepNumber: number;
  title: string;
  reference: string;
  formula: string;
  substitution: string;
  result: string;
  explanation: string;
  status?: 'pass' | 'fail' | 'info';
}

export interface ColumnResult {
  isValid: boolean;
  overallStatus: 'ADEQUATE' | 'INADEQUATE';
  steps: CalculationStep[];
  summary: {
    columnType: string;
    slendernessRatio: number;
    slendernessLimit: number;
    isShortColumn: boolean;
    ultimateLoad: number;
    ultimateMoment: number;
    axialCapacity: number;
    momentCapacity: number;
    requiredSteelArea: number;
    providedSteelArea: number;
    providedBars: string;
    utilizationRatio: number;
    linkSpacing: number;
  };
  failureReasons: string[];
  suggestions: string[];
}

// Standard bar areas (mm²)
const barAreas: { [key: number]: number } = {
  8: 50.3,
  10: 78.5,
  12: 113.1,
  16: 201.1,
  20: 314.2,
  25: 490.9,
  32: 804.2,
  40: 1256.6
};

export function calculateColumnDesign(inputs: ColumnInputs): ColumnResult {
  const steps: CalculationStep[] = [];
  const failureReasons: string[] = [];
  const suggestions: string[] = [];
  let stepNumber = 0;

  // =============================================
  // SECTION A: LOADING CALCULATIONS
  // =============================================
  
  // Step 1: Ultimate Axial Load
  stepNumber++;
  const ultimateLoad = 1.4 * inputs.deadLoad + 1.6 * inputs.liveLoad;
  steps.push({
    stepNumber,
    title: "Ultimate Axial Load (N)",
    reference: "BS 8110-1 Cl. 2.4.3",
    formula: "N = 1.4Gk + 1.6Qk",
    substitution: `N = 1.4 × ${inputs.deadLoad} + 1.6 × ${inputs.liveLoad}`,
    result: `N = ${ultimateLoad.toFixed(2)} kN`,
    explanation: "Ultimate design axial load using partial safety factors for dead and live loads.",
    status: 'info'
  });

  // Step 2: Ultimate Design Moment
  stepNumber++;
  const ultimateMoment = 1.4 * inputs.deadLoadMoment + 1.6 * inputs.liveLoadMoment;
  steps.push({
    stepNumber,
    title: "Ultimate Design Moment (M)",
    reference: "BS 8110-1 Cl. 2.4.3",
    formula: "M = 1.4Mgk + 1.6Mqk",
    substitution: `M = 1.4 × ${inputs.deadLoadMoment} + 1.6 × ${inputs.liveLoadMoment}`,
    result: `M = ${ultimateMoment.toFixed(2)} kNm`,
    explanation: "Ultimate design moment from applied loads.",
    status: 'info'
  });

  // =============================================
  // SECTION B: COLUMN CLASSIFICATION
  // =============================================
  
  // Step 3: Effective Depth
  stepNumber++;
  const d = inputs.columnDepth - inputs.cover - inputs.linkDiameter - inputs.mainBarDiameter / 2;
  steps.push({
    stepNumber,
    title: "Effective Depth (d)",
    reference: "BS 8110-1 Cl. 3.8.1.3",
    formula: "d = h - cover - link diameter - (main bar diameter / 2)",
    substitution: `d = ${inputs.columnDepth} - ${inputs.cover} - ${inputs.linkDiameter} - (${inputs.mainBarDiameter} / 2)`,
    result: `d = ${d.toFixed(1)} mm`,
    explanation: "Effective depth from compression face to centroid of tension reinforcement.",
    status: 'info'
  });

  // Step 4: Slenderness Ratio
  stepNumber++;
  const slendernessRatioH = inputs.effectiveLength / inputs.columnDepth;
  const slendernessRatioB = inputs.effectiveLength / inputs.columnWidth;
  const slendernessRatio = Math.max(slendernessRatioH, slendernessRatioB);
  steps.push({
    stepNumber,
    title: "Slenderness Ratio (le/h or le/b)",
    reference: "BS 8110-1 Cl. 3.8.1.3",
    formula: "λ = le / h (or le / b, whichever is critical)",
    substitution: `λ_h = ${inputs.effectiveLength} / ${inputs.columnDepth} = ${slendernessRatioH.toFixed(2)}\nλ_b = ${inputs.effectiveLength} / ${inputs.columnWidth} = ${slendernessRatioB.toFixed(2)}`,
    result: `λ = ${slendernessRatio.toFixed(2)} (critical value)`,
    explanation: "Slenderness ratio determines whether column is short or slender.",
    status: 'info'
  });

  // Step 5: Column Classification
  stepNumber++;
  const slendernessLimit = 15; // For braced columns
  const isShortColumn = slendernessRatio <= slendernessLimit;
  steps.push({
    stepNumber,
    title: "Column Classification",
    reference: "BS 8110-1 Cl. 3.8.1.3",
    formula: "Short column if: le/h ≤ 15 (braced) or le/h ≤ 10 (unbraced)",
    substitution: `${slendernessRatio.toFixed(2)} ${isShortColumn ? '≤' : '>'} ${slendernessLimit}`,
    result: isShortColumn ? "SHORT BRACED COLUMN" : "SLENDER COLUMN",
    explanation: isShortColumn 
      ? "Column is classified as short - second order effects may be neglected."
      : "Column is slender - additional moments due to deflection must be considered.",
    status: isShortColumn ? 'pass' : 'info'
  });

  let columnType = isShortColumn ? "Short Braced Column" : "Slender Column";

  // =============================================
  // SECTION C: MINIMUM ECCENTRICITY
  // =============================================
  
  // Step 6: Minimum Eccentricity
  stepNumber++;
  const eMin = Math.max(inputs.columnDepth / 20, 20); // mm
  const minMoment = (ultimateLoad * eMin) / 1000; // kNm
  steps.push({
    stepNumber,
    title: "Minimum Eccentricity Check",
    reference: "BS 8110-1 Cl. 3.8.2.4",
    formula: "e_min = max(h/20, 20mm)\nM_min = N × e_min",
    substitution: `e_min = max(${inputs.columnDepth}/20, 20) = max(${(inputs.columnDepth/20).toFixed(1)}, 20)\nM_min = ${ultimateLoad.toFixed(2)} × ${eMin.toFixed(1)} / 1000`,
    result: `e_min = ${eMin.toFixed(1)} mm\nM_min = ${minMoment.toFixed(2)} kNm`,
    explanation: "All columns must be designed for a minimum eccentricity to account for construction imperfections.",
    status: 'info'
  });

  // Step 7: Design Moment (larger of applied and minimum)
  stepNumber++;
  const designMoment = Math.max(ultimateMoment, minMoment);
  steps.push({
    stepNumber,
    title: "Design Moment",
    reference: "BS 8110-1 Cl. 3.8.2.4",
    formula: "M_design = max(M_applied, M_min)",
    substitution: `M_design = max(${ultimateMoment.toFixed(2)}, ${minMoment.toFixed(2)})`,
    result: `M_design = ${designMoment.toFixed(2)} kNm`,
    explanation: "Design moment is the greater of applied moment and minimum moment from eccentricity.",
    status: 'info'
  });

  // =============================================
  // SECTION D: AXIAL CAPACITY CHECK
  // =============================================
  
  // Step 8: Gross Section Area
  stepNumber++;
  const Ac = inputs.columnWidth * inputs.columnDepth;
  steps.push({
    stepNumber,
    title: "Gross Section Area (Ac)",
    reference: "BS 8110-1 Cl. 3.8.4.3",
    formula: "Ac = b × h",
    substitution: `Ac = ${inputs.columnWidth} × ${inputs.columnDepth}`,
    result: `Ac = ${Ac.toFixed(0)} mm²`,
    explanation: "Gross cross-sectional area of the column.",
    status: 'info'
  });

  // Step 9: Minimum Steel Area (0.4% Ac for columns)
  stepNumber++;
  const minSteelArea = 0.004 * Ac;
  const maxSteelArea = 0.06 * Ac;
  steps.push({
    stepNumber,
    title: "Steel Area Limits",
    reference: "BS 8110-1 Cl. 3.12.5.3",
    formula: "As_min = 0.4% × Ac\nAs_max = 6% × Ac",
    substitution: `As_min = 0.004 × ${Ac}\nAs_max = 0.06 × ${Ac}`,
    result: `As_min = ${minSteelArea.toFixed(0)} mm²\nAs_max = ${maxSteelArea.toFixed(0)} mm²`,
    explanation: "Reinforcement must be between 0.4% and 6% of gross section area.",
    status: 'info'
  });

  // Step 10: Axial Capacity (Short Column Equation)
  stepNumber++;
  // For short braced column with moments: N = 0.35fcuAc + 0.67fyAsc
  // Initially estimate with minimum steel
  const N_capacity_minSteel = (0.35 * inputs.concreteGrade * Ac + 0.67 * inputs.steelGrade * minSteelArea) / 1000;
  steps.push({
    stepNumber,
    title: "Axial Capacity (with minimum steel)",
    reference: "BS 8110-1 Cl. 3.8.4.3",
    formula: "N = 0.35 × fcu × Ac + 0.67 × fy × Asc",
    substitution: `N = 0.35 × ${inputs.concreteGrade} × ${Ac} + 0.67 × ${inputs.steelGrade} × ${minSteelArea.toFixed(0)}`,
    result: `N_capacity = ${N_capacity_minSteel.toFixed(2)} kN`,
    explanation: "Ultimate axial capacity using BS 8110 equation for short braced columns.",
    status: N_capacity_minSteel >= ultimateLoad ? 'pass' : 'info'
  });

  // =============================================
  // SECTION E: REINFORCEMENT DESIGN
  // =============================================
  
  // Step 11: Required Steel Area from N/Ac ratio
  stepNumber++;
  const N_kN = ultimateLoad;
  const M_kNm = designMoment;
  
  // Using simplified approach: N = 0.35fcuAc + 0.67fyAsc
  // Rearranging: Asc = (N - 0.35fcuAc) / (0.67fy)
  let requiredSteelFromAxial = ((N_kN * 1000) - 0.35 * inputs.concreteGrade * Ac) / (0.67 * inputs.steelGrade);
  requiredSteelFromAxial = Math.max(requiredSteelFromAxial, minSteelArea);
  
  steps.push({
    stepNumber,
    title: "Required Steel Area (from axial load)",
    reference: "BS 8110-1 Cl. 3.8.4.3",
    formula: "Asc = (N - 0.35 × fcu × Ac) / (0.67 × fy)",
    substitution: `Asc = (${(N_kN * 1000).toFixed(0)} - 0.35 × ${inputs.concreteGrade} × ${Ac}) / (0.67 × ${inputs.steelGrade})`,
    result: `Asc = ${requiredSteelFromAxial.toFixed(0)} mm²`,
    explanation: "Steel area required to resist the applied axial load.",
    status: 'info'
  });

  // Step 12: N/bhfcu ratio for design chart
  stepNumber++;
  const N_bhfcu = (N_kN * 1000) / (inputs.columnWidth * inputs.columnDepth * inputs.concreteGrade);
  steps.push({
    stepNumber,
    title: "N/(bh × fcu) Ratio",
    reference: "BS 8110-1 Part 3 Design Charts",
    formula: "N/(bh × fcu)",
    substitution: `N/(bh × fcu) = ${(N_kN * 1000).toFixed(0)} / (${inputs.columnWidth} × ${inputs.columnDepth} × ${inputs.concreteGrade})`,
    result: `N/(bh × fcu) = ${N_bhfcu.toFixed(3)}`,
    explanation: "This ratio is used with design charts to determine required reinforcement.",
    status: 'info'
  });

  // Step 13: M/bh²fcu ratio for design chart
  stepNumber++;
  const M_bh2fcu = (M_kNm * 1e6) / (inputs.columnWidth * Math.pow(inputs.columnDepth, 2) * inputs.concreteGrade);
  steps.push({
    stepNumber,
    title: "M/(bh² × fcu) Ratio",
    reference: "BS 8110-1 Part 3 Design Charts",
    formula: "M/(bh² × fcu)",
    substitution: `M/(bh² × fcu) = ${(M_kNm * 1e6).toFixed(0)} / (${inputs.columnWidth} × ${inputs.columnDepth}² × ${inputs.concreteGrade})`,
    result: `M/(bh² × fcu) = ${M_bh2fcu.toFixed(4)}`,
    explanation: "This ratio is used with design charts to determine required reinforcement.",
    status: 'info'
  });

  // Step 14: d/h ratio
  stepNumber++;
  const d_h_ratio = d / inputs.columnDepth;
  steps.push({
    stepNumber,
    title: "d/h Ratio",
    reference: "BS 8110-1 Part 3 Design Charts",
    formula: "d/h",
    substitution: `d/h = ${d.toFixed(1)} / ${inputs.columnDepth}`,
    result: `d/h = ${d_h_ratio.toFixed(2)}`,
    explanation: "Ratio of effective depth to overall depth, used for selecting appropriate design chart.",
    status: 'info'
  });

  // Step 15: Estimate Asc from interaction diagram (simplified calculation)
  stepNumber++;
  // Simplified approach using combined axial and moment
  // From charts, approximate: Asc.fy/(bh.fcu) 
  // For preliminary design, use a conservative estimate
  const K_factor = M_bh2fcu / 0.156; // Normalized moment factor
  let requiredSteelFromMoment = 0;
  
  if (K_factor > 0.05) {
    // Need compression steel contribution
    requiredSteelFromMoment = (M_kNm * 1e6) / (0.87 * inputs.steelGrade * (d - inputs.cover - inputs.linkDiameter));
  }
  
  const totalRequiredSteel = Math.max(requiredSteelFromAxial + requiredSteelFromMoment, minSteelArea);
  
  steps.push({
    stepNumber,
    title: "Total Required Steel Area",
    reference: "BS 8110-1 Cl. 3.8.4",
    formula: "Asc_total = Asc_axial + Asc_moment (but ≥ As_min)",
    substitution: `Asc_total = ${requiredSteelFromAxial.toFixed(0)} + ${requiredSteelFromMoment.toFixed(0)} = ${(requiredSteelFromAxial + requiredSteelFromMoment).toFixed(0)}\nMinimum = ${minSteelArea.toFixed(0)} mm²`,
    result: `Asc_required = ${totalRequiredSteel.toFixed(0)} mm²`,
    explanation: "Total reinforcement required considering both axial load and bending moment.",
    status: totalRequiredSteel <= maxSteelArea ? 'pass' : 'fail'
  });

  // Step 16: Select Reinforcement Bars
  stepNumber++;
  let selectedBars = "";
  let providedArea = 0;
  let numBars = 4; // Minimum 4 bars for rectangular column
  
  // Find suitable bar arrangement
  for (const [diameter, area] of Object.entries(barAreas).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    for (let n = 4; n <= 12; n += 2) { // Even number of bars for symmetry
      const totalArea = n * area;
      if (totalArea >= totalRequiredSteel) {
        selectedBars = `${n}T${diameter}`;
        providedArea = totalArea;
        numBars = n;
        break;
      }
    }
    if (providedArea >= totalRequiredSteel) break;
  }
  
  // Fallback if no suitable combination found
  if (providedArea < totalRequiredSteel) {
    numBars = 8;
    providedArea = numBars * barAreas[32];
    selectedBars = `8T32`;
  }
  
  steps.push({
    stepNumber,
    title: "Reinforcement Selection",
    reference: "BS 8110-1 Cl. 3.12.5",
    formula: "Select bars such that As_provided ≥ As_required",
    substitution: `Required: ${totalRequiredSteel.toFixed(0)} mm²\nTry ${selectedBars}`,
    result: `Provide ${selectedBars} (As = ${providedArea.toFixed(0)} mm²)`,
    explanation: `${numBars} bars arranged symmetrically with at least one bar at each corner.`,
    status: providedArea >= totalRequiredSteel ? 'pass' : 'fail'
  });

  // =============================================
  // SECTION F: LINK DESIGN
  // =============================================
  
  // Step 17: Link Diameter
  stepNumber++;
  const mainBarDia = inputs.mainBarDiameter;
  const minLinkDia = Math.max(6, mainBarDia / 4);
  steps.push({
    stepNumber,
    title: "Link Diameter",
    reference: "BS 8110-1 Cl. 3.12.7.1",
    formula: "Link diameter ≥ max(6mm, main bar diameter / 4)",
    substitution: `Link diameter ≥ max(6, ${mainBarDia} / 4) = max(6, ${(mainBarDia/4).toFixed(1)})`,
    result: `Minimum link diameter = ${minLinkDia.toFixed(0)} mm\nProvide ${inputs.linkDiameter}mm links`,
    explanation: "Links must be of adequate size to properly restrain the main bars.",
    status: inputs.linkDiameter >= minLinkDia ? 'pass' : 'fail'
  });

  // Step 18: Link Spacing
  stepNumber++;
  const maxLinkSpacing = Math.min(12 * mainBarDia, inputs.columnWidth, inputs.columnDepth);
  const providedLinkSpacing = Math.min(maxLinkSpacing, 300); // Practical limit
  steps.push({
    stepNumber,
    title: "Link Spacing",
    reference: "BS 8110-1 Cl. 3.12.7.2",
    formula: "Spacing ≤ min(12 × main bar dia, b, h)",
    substitution: `Spacing ≤ min(12 × ${mainBarDia}, ${inputs.columnWidth}, ${inputs.columnDepth})\nSpacing ≤ min(${12 * mainBarDia}, ${inputs.columnWidth}, ${inputs.columnDepth})`,
    result: `Maximum spacing = ${maxLinkSpacing.toFixed(0)} mm\nProvide R${inputs.linkDiameter}@${providedLinkSpacing}mm c/c`,
    explanation: "Maximum link spacing ensures adequate lateral restraint of longitudinal bars.",
    status: 'pass'
  });

  // =============================================
  // SECTION G: CAPACITY VERIFICATION
  // =============================================
  
  // Step 19: Final Axial Capacity
  stepNumber++;
  const finalAxialCapacity = (0.35 * inputs.concreteGrade * Ac + 0.67 * inputs.steelGrade * providedArea) / 1000;
  const axialUtilization = (ultimateLoad / finalAxialCapacity) * 100;
  steps.push({
    stepNumber,
    title: "Final Axial Capacity Check",
    reference: "BS 8110-1 Cl. 3.8.4.3",
    formula: "N_capacity = 0.35 × fcu × Ac + 0.67 × fy × Asc",
    substitution: `N_capacity = (0.35 × ${inputs.concreteGrade} × ${Ac} + 0.67 × ${inputs.steelGrade} × ${providedArea.toFixed(0)}) / 1000`,
    result: `N_capacity = ${finalAxialCapacity.toFixed(2)} kN\nN_applied = ${ultimateLoad.toFixed(2)} kN\nUtilization = ${axialUtilization.toFixed(1)}%`,
    explanation: finalAxialCapacity >= ultimateLoad 
      ? "Axial capacity is adequate for the applied load."
      : "Axial capacity is insufficient - increase section size or reinforcement.",
    status: finalAxialCapacity >= ultimateLoad ? 'pass' : 'fail'
  });

  // Step 20: Moment Capacity
  stepNumber++;
  const z = 0.9 * d; // Approximate lever arm
  const momentCapacity = (0.87 * inputs.steelGrade * (providedArea / 2) * z) / 1e6;
  const momentUtilization = (designMoment / momentCapacity) * 100;
  steps.push({
    stepNumber,
    title: "Moment Capacity Check",
    reference: "BS 8110-1 Cl. 3.4.4.4",
    formula: "M_capacity ≈ 0.87 × fy × (Asc/2) × z",
    substitution: `M_capacity = 0.87 × ${inputs.steelGrade} × (${providedArea.toFixed(0)}/2) × ${z.toFixed(1)} / 10⁶`,
    result: `M_capacity = ${momentCapacity.toFixed(2)} kNm\nM_applied = ${designMoment.toFixed(2)} kNm\nUtilization = ${momentUtilization.toFixed(1)}%`,
    explanation: momentCapacity >= designMoment 
      ? "Moment capacity is adequate for the applied moment."
      : "Moment capacity is insufficient - increase reinforcement or section size.",
    status: momentCapacity >= designMoment ? 'pass' : 'fail'
  });

  // Determine overall validity
  let isValid = true;
  
  if (finalAxialCapacity < ultimateLoad) {
    isValid = false;
    failureReasons.push("Axial capacity is insufficient for the applied load.");
    suggestions.push("Increase column section dimensions.");
    suggestions.push("Increase concrete grade.");
    suggestions.push("Increase reinforcement area.");
  }
  
  if (momentCapacity < designMoment) {
    isValid = false;
    failureReasons.push("Moment capacity is insufficient for the applied moment.");
    suggestions.push("Increase column depth in the direction of bending.");
    suggestions.push("Increase reinforcement on tension face.");
  }
  
  if (providedArea < minSteelArea) {
    isValid = false;
    failureReasons.push("Provided reinforcement is less than minimum required.");
    suggestions.push(`Increase reinforcement to at least ${minSteelArea.toFixed(0)} mm².`);
  }
  
  if (providedArea > maxSteelArea) {
    isValid = false;
    failureReasons.push("Provided reinforcement exceeds maximum allowed (6%).");
    suggestions.push("Increase column section dimensions to reduce steel percentage.");
  }
  
  if (!isShortColumn) {
    suggestions.push("Consider slender column design with additional moments due to P-δ effects.");
  }

  const utilizationRatio = Math.max(axialUtilization, momentUtilization);

  return {
    isValid,
    overallStatus: isValid ? 'ADEQUATE' : 'INADEQUATE',
    steps,
    summary: {
      columnType,
      slendernessRatio,
      slendernessLimit,
      isShortColumn,
      ultimateLoad,
      ultimateMoment: designMoment,
      axialCapacity: finalAxialCapacity,
      momentCapacity,
      requiredSteelArea: totalRequiredSteel,
      providedSteelArea: providedArea,
      providedBars: selectedBars,
      utilizationRatio,
      linkSpacing: providedLinkSpacing
    },
    failureReasons,
    suggestions
  };
}
