import React from 'react';

interface BeamDiagramProps {
  width: number;
  depth: number;
  cover: number;
  topBars?: string;
  bottomBars?: string;
  links?: string;
  isDoublyReinforced?: boolean;
}

export const BeamDiagram: React.FC<BeamDiagramProps> = ({
  width,
  depth,
  cover,
  topBars = "2T12",
  bottomBars = "3T16",
  links = "T10@200",
  isDoublyReinforced = false,
}) => {
  // Scale for visualization
  const scale = 0.4;
  const svgWidth = Math.max(width * scale + 100, 250);
  const svgHeight = depth * scale + 120;
  const offsetX = 50;
  const offsetY = 40;
  
  const scaledWidth = width * scale;
  const scaledDepth = depth * scale;
  const scaledCover = cover * scale;
  
  // Bar positions
  const barRadius = 6;
  const linkThickness = 2;
  
  // Calculate number of bars from string (e.g., "3T16" -> 3)
  const parseBarCount = (barStr: string) => {
    const match = barStr.match(/(\d+)T/);
    return match ? parseInt(match[1]) : 2;
  };
  
  const topBarCount = parseBarCount(topBars);
  const bottomBarCount = parseBarCount(bottomBars);
  
  // Generate bar positions
  const generateBarPositions = (count: number, y: number, startX: number, endX: number) => {
    const positions = [];
    const spacing = (endX - startX) / (count + 1);
    for (let i = 1; i <= count; i++) {
      positions.push({ x: startX + spacing * i, y });
    }
    return positions;
  };
  
  const topBarPositions = generateBarPositions(
    topBarCount,
    offsetY + scaledCover + barRadius,
    offsetX + scaledCover,
    offsetX + scaledWidth - scaledCover
  );
  
  const bottomBarPositions = generateBarPositions(
    bottomBarCount,
    offsetY + scaledDepth - scaledCover - barRadius,
    offsetX + scaledCover,
    offsetX + scaledWidth - scaledCover
  );

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">Beam Cross-Section</h4>
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
        {/* Main beam outline */}
        <rect
          x={offsetX}
          y={offsetY}
          width={scaledWidth}
          height={scaledDepth}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground"
        />
        
        {/* Cover zone (dashed) */}
        <rect
          x={offsetX + scaledCover}
          y={offsetY + scaledCover}
          width={scaledWidth - 2 * scaledCover}
          height={scaledDepth - 2 * scaledCover}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4,4"
          className="text-muted-foreground"
        />
        
        {/* Links (stirrups) */}
        <rect
          x={offsetX + scaledCover - linkThickness}
          y={offsetY + scaledCover - linkThickness}
          width={scaledWidth - 2 * scaledCover + 2 * linkThickness}
          height={scaledDepth - 2 * scaledCover + 2 * linkThickness}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={linkThickness}
          rx="2"
        />
        
        {/* Top reinforcement (compression steel if doubly reinforced) */}
        {topBarPositions.map((pos, i) => (
          <g key={`top-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={barRadius}
              fill={isDoublyReinforced ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))"}
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={barRadius - 2}
              fill="hsl(var(--background))"
            />
          </g>
        ))}
        
        {/* Bottom reinforcement (main tension steel) */}
        {bottomBarPositions.map((pos, i) => (
          <g key={`bottom-${i}`}>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={barRadius}
              fill="hsl(var(--destructive))"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={barRadius - 2}
              fill="hsl(var(--background))"
            />
          </g>
        ))}
        
        {/* Dimension lines */}
        {/* Width dimension */}
        <line
          x1={offsetX}
          y1={offsetY + scaledDepth + 20}
          x2={offsetX + scaledWidth}
          y2={offsetY + scaledDepth + 20}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />
        <line x1={offsetX} y1={offsetY + scaledDepth + 15} x2={offsetX} y2={offsetY + scaledDepth + 25} stroke="currentColor" strokeWidth="1" />
        <line x1={offsetX + scaledWidth} y1={offsetY + scaledDepth + 15} x2={offsetX + scaledWidth} y2={offsetY + scaledDepth + 25} stroke="currentColor" strokeWidth="1" />
        <text
          x={offsetX + scaledWidth / 2}
          y={offsetY + scaledDepth + 35}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          b = {width}mm
        </text>
        
        {/* Depth dimension */}
        <line
          x1={offsetX + scaledWidth + 20}
          y1={offsetY}
          x2={offsetX + scaledWidth + 20}
          y2={offsetY + scaledDepth}
          stroke="currentColor"
          strokeWidth="1"
          className="text-muted-foreground"
        />
        <line x1={offsetX + scaledWidth + 15} y1={offsetY} x2={offsetX + scaledWidth + 25} y2={offsetY} stroke="currentColor" strokeWidth="1" />
        <line x1={offsetX + scaledWidth + 15} y1={offsetY + scaledDepth} x2={offsetX + scaledWidth + 25} y2={offsetY + scaledDepth} stroke="currentColor" strokeWidth="1" />
        <text
          x={offsetX + scaledWidth + 35}
          y={offsetY + scaledDepth / 2}
          textAnchor="start"
          dominantBaseline="middle"
          className="fill-muted-foreground text-xs"
        >
          h = {depth}mm
        </text>
        
        {/* Legend */}
        <g transform={`translate(${offsetX}, ${offsetY - 25})`}>
          <circle cx="5" cy="0" r="4" fill="hsl(var(--destructive))" />
          <text x="12" y="3" className="fill-foreground text-xs">Bottom: {bottomBars}</text>
          
          <circle cx="100" cy="0" r="4" fill={isDoublyReinforced ? "hsl(var(--warning))" : "hsl(var(--muted-foreground))"} />
          <text x="107" y="3" className="fill-foreground text-xs">Top: {topBars}</text>
        </g>
        
        {/* Links label */}
        <text
          x={offsetX - 5}
          y={offsetY + scaledDepth / 2}
          textAnchor="end"
          dominantBaseline="middle"
          className="fill-primary text-xs font-medium"
        >
          {links}
        </text>
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Tension Steel</span>
        </div>
        {isDoublyReinforced && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Compression Steel</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-primary" />
          <span>Links</span>
        </div>
      </div>
    </div>
  );
};
