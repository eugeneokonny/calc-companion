import React from 'react';

interface ColumnDiagramProps {
  width: number;
  depth: number;
  cover: number;
  mainBars: string;
  links: string;
}

export const ColumnDiagram: React.FC<ColumnDiagramProps> = ({
  width,
  depth,
  cover,
  mainBars = "4T16",
  links = "T8@200",
}) => {
  const scale = 0.5;
  const svgWidth = Math.max(width * scale + 120, 280);
  const svgHeight = Math.max(depth * scale + 140, 280);
  const offsetX = 60;
  const offsetY = 50;
  
  const scaledWidth = width * scale;
  const scaledDepth = depth * scale;
  const scaledCover = cover * scale;
  
  const barRadius = 7;
  const linkThickness = 2;
  
  // Parse bar count (e.g., "4T16" -> 4, "6T20" -> 6)
  const parseBarCount = (barStr: string) => {
    const match = barStr.match(/(\d+)T/);
    return match ? parseInt(match[1]) : 4;
  };
  
  const barCount = parseBarCount(mainBars);
  
  // Generate corner and intermediate bar positions
  const generateBarPositions = (count: number) => {
    const positions = [];
    const innerWidth = scaledWidth - 2 * scaledCover;
    const innerHeight = scaledDepth - 2 * scaledCover;
    const baseX = offsetX + scaledCover;
    const baseY = offsetY + scaledCover;
    
    if (count === 4) {
      // 4 corners
      positions.push({ x: baseX, y: baseY });
      positions.push({ x: baseX + innerWidth, y: baseY });
      positions.push({ x: baseX, y: baseY + innerHeight });
      positions.push({ x: baseX + innerWidth, y: baseY + innerHeight });
    } else if (count === 6) {
      // 4 corners + 2 on long sides
      positions.push({ x: baseX, y: baseY });
      positions.push({ x: baseX + innerWidth / 2, y: baseY });
      positions.push({ x: baseX + innerWidth, y: baseY });
      positions.push({ x: baseX, y: baseY + innerHeight });
      positions.push({ x: baseX + innerWidth / 2, y: baseY + innerHeight });
      positions.push({ x: baseX + innerWidth, y: baseY + innerHeight });
    } else if (count === 8) {
      // 4 corners + 4 intermediate
      positions.push({ x: baseX, y: baseY });
      positions.push({ x: baseX + innerWidth / 2, y: baseY });
      positions.push({ x: baseX + innerWidth, y: baseY });
      positions.push({ x: baseX, y: baseY + innerHeight / 2 });
      positions.push({ x: baseX + innerWidth, y: baseY + innerHeight / 2 });
      positions.push({ x: baseX, y: baseY + innerHeight });
      positions.push({ x: baseX + innerWidth / 2, y: baseY + innerHeight });
      positions.push({ x: baseX + innerWidth, y: baseY + innerHeight });
    } else {
      // Distribute evenly around perimeter
      const perimeter = 2 * (innerWidth + innerHeight);
      const spacing = perimeter / count;
      let distance = 0;
      
      for (let i = 0; i < count; i++) {
        let x, y;
        if (distance < innerWidth) {
          x = baseX + distance;
          y = baseY;
        } else if (distance < innerWidth + innerHeight) {
          x = baseX + innerWidth;
          y = baseY + (distance - innerWidth);
        } else if (distance < 2 * innerWidth + innerHeight) {
          x = baseX + innerWidth - (distance - innerWidth - innerHeight);
          y = baseY + innerHeight;
        } else {
          x = baseX;
          y = baseY + innerHeight - (distance - 2 * innerWidth - innerHeight);
        }
        positions.push({ x, y });
        distance += spacing;
      }
    }
    
    return positions;
  };
  
  const barPositions = generateBarPositions(barCount);

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">Column Cross-Section</h4>
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
        {/* Main column outline */}
        <rect
          x={offsetX}
          y={offsetY}
          width={scaledWidth}
          height={scaledDepth}
          fill="hsl(var(--muted))"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground"
        />
        
        {/* Links (outer) */}
        <rect
          x={offsetX + scaledCover - linkThickness}
          y={offsetY + scaledCover - linkThickness}
          width={scaledWidth - 2 * scaledCover + 2 * linkThickness}
          height={scaledDepth - 2 * scaledCover + 2 * linkThickness}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={linkThickness}
          rx="3"
        />
        
        {/* Main reinforcement bars */}
        {barPositions.map((pos, i) => (
          <g key={i}>
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
              r={barRadius - 3}
              fill="hsl(var(--background))"
            />
          </g>
        ))}
        
        {/* Dimension lines - width */}
        <g className="text-muted-foreground">
          <line
            x1={offsetX}
            y1={offsetY + scaledDepth + 25}
            x2={offsetX + scaledWidth}
            y2={offsetY + scaledDepth + 25}
            stroke="currentColor"
            strokeWidth="1"
          />
          <line x1={offsetX} y1={offsetY + scaledDepth + 20} x2={offsetX} y2={offsetY + scaledDepth + 30} stroke="currentColor" strokeWidth="1" />
          <line x1={offsetX + scaledWidth} y1={offsetY + scaledDepth + 20} x2={offsetX + scaledWidth} y2={offsetY + scaledDepth + 30} stroke="currentColor" strokeWidth="1" />
          <text
            x={offsetX + scaledWidth / 2}
            y={offsetY + scaledDepth + 42}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            b = {width}mm
          </text>
        </g>
        
        {/* Dimension lines - depth */}
        <g className="text-muted-foreground">
          <line
            x1={offsetX + scaledWidth + 25}
            y1={offsetY}
            x2={offsetX + scaledWidth + 25}
            y2={offsetY + scaledDepth}
            stroke="currentColor"
            strokeWidth="1"
          />
          <line x1={offsetX + scaledWidth + 20} y1={offsetY} x2={offsetX + scaledWidth + 30} y2={offsetY} stroke="currentColor" strokeWidth="1" />
          <line x1={offsetX + scaledWidth + 20} y1={offsetY + scaledDepth} x2={offsetX + scaledWidth + 30} y2={offsetY + scaledDepth} stroke="currentColor" strokeWidth="1" />
          <text
            x={offsetX + scaledWidth + 42}
            y={offsetY + scaledDepth / 2}
            textAnchor="start"
            dominantBaseline="middle"
            className="fill-muted-foreground text-xs"
          >
            h = {depth}mm
          </text>
        </g>
        
        {/* Cover dimension */}
        <g className="text-muted-foreground">
          <line
            x1={offsetX}
            y1={offsetY - 10}
            x2={offsetX + scaledCover}
            y2={offsetY - 10}
            stroke="currentColor"
            strokeWidth="1"
          />
          <text
            x={offsetX + scaledCover / 2}
            y={offsetY - 15}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            c={cover}
          </text>
        </g>
        
        {/* Reinforcement label */}
        <text
          x={offsetX + scaledWidth / 2}
          y={offsetY - 25}
          textAnchor="middle"
          className="fill-foreground text-sm font-medium"
        >
          {mainBars}
        </text>
        
        {/* Links label */}
        <text
          x={offsetX - 10}
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
          <span>Main Bars: {mainBars}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded border-2 border-primary" />
          <span>Links: {links}</span>
        </div>
      </div>
    </div>
  );
};
