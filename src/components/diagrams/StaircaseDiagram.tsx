import React from 'react';

interface StaircaseDiagramProps {
  spanLength: number;
  waistThickness: number;
  riserHeight: number;
  goingLength: number;
  numberOfSteps: number;
  cover: number;
  mainBars?: string;
  distributionBars?: string;
}

export const StaircaseDiagram: React.FC<StaircaseDiagramProps> = ({
  spanLength,
  waistThickness,
  riserHeight,
  goingLength,
  numberOfSteps,
  cover,
  mainBars = "T12@150",
  distributionBars = "T10@250",
}) => {
  const svgWidth = 600;
  const svgHeight = 350;
  const offsetX = 80;
  const offsetY = 50;
  
  // Scale factors
  const availableWidth = svgWidth - 2 * offsetX;
  const availableHeight = svgHeight - 2 * offsetY - 50;
  
  const totalRise = riserHeight * numberOfSteps;
  const totalGoing = goingLength * numberOfSteps;
  
  const scaleX = availableWidth / (spanLength * 1000);
  const scaleY = availableHeight / (totalRise + waistThickness);
  const scale = Math.min(scaleX, scaleY, 0.15);
  
  const scaledRiser = riserHeight * scale;
  const scaledGoing = goingLength * scale;
  const scaledWaist = waistThickness * scale;
  
  // Generate step points
  const generateStepPath = () => {
    let path = `M ${offsetX} ${offsetY + availableHeight}`;
    let x = offsetX;
    let y = offsetY + availableHeight;
    
    for (let i = 0; i < numberOfSteps; i++) {
      // Riser (vertical)
      y -= scaledRiser;
      path += ` L ${x} ${y}`;
      // Going (horizontal)
      x += scaledGoing;
      path += ` L ${x} ${y}`;
    }
    
    return { path, endX: x, endY: y };
  };
  
  const { path: topPath, endX, endY } = generateStepPath();
  
  // Bottom of waist slab (parallel to slope)
  const slopeAngle = Math.atan2(totalRise * scale, totalGoing * scale);
  const waistOffsetX = scaledWaist * Math.sin(slopeAngle);
  const waistOffsetY = scaledWaist * Math.cos(slopeAngle);

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">Staircase Section</h4>
      
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
        {/* Staircase outline - top (steps) */}
        <path
          d={topPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground"
        />
        
        {/* Waist slab (bottom line) */}
        <line
          x1={offsetX - waistOffsetX}
          y1={offsetY + availableHeight + waistOffsetY}
          x2={endX - waistOffsetX}
          y2={endY + waistOffsetY}
          stroke="currentColor"
          strokeWidth="2"
          className="text-foreground"
        />
        
        {/* Connect ends */}
        <line
          x1={offsetX}
          y1={offsetY + availableHeight}
          x2={offsetX - waistOffsetX}
          y2={offsetY + availableHeight + waistOffsetY}
          stroke="currentColor"
          strokeWidth="2"
        />
        <line
          x1={endX}
          y1={endY}
          x2={endX - waistOffsetX}
          y2={endY + waistOffsetY}
          stroke="currentColor"
          strokeWidth="2"
        />
        
        {/* Fill the stair section */}
        <path
          d={`${topPath} L ${endX - waistOffsetX} ${endY + waistOffsetY} L ${offsetX - waistOffsetX} ${offsetY + availableHeight + waistOffsetY} Z`}
          fill="hsl(var(--muted))"
          stroke="none"
        />
        
        {/* Main reinforcement (bottom - along slope) */}
        <line
          x1={offsetX - waistOffsetX + 10}
          y1={offsetY + availableHeight + waistOffsetY - 5}
          x2={endX - waistOffsetX - 10}
          y2={endY + waistOffsetY - 5}
          stroke="hsl(var(--destructive))"
          strokeWidth="4"
        />
        
        {/* Distribution steel indicators (perpendicular crosses) */}
        {[...Array(8)].map((_, i) => {
          const t = (i + 1) / 9;
          const x = offsetX + t * (endX - offsetX) - waistOffsetX;
          const y = (offsetY + availableHeight) + t * (endY - offsetY - availableHeight) + waistOffsetY - 5;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="3" fill="hsl(var(--primary))" />
            </g>
          );
        })}
        
        {/* Left support */}
        <g>
          <polygon
            points={`${offsetX - waistOffsetX - 20},${offsetY + availableHeight + waistOffsetY + 30} ${offsetX - waistOffsetX},${offsetY + availableHeight + waistOffsetY} ${offsetX - waistOffsetX + 20},${offsetY + availableHeight + waistOffsetY + 30}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1={offsetX - waistOffsetX - 25}
            y1={offsetY + availableHeight + waistOffsetY + 30}
            x2={offsetX - waistOffsetX + 25}
            y2={offsetY + availableHeight + waistOffsetY + 30}
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
        
        {/* Right support */}
        <g>
          <polygon
            points={`${endX - waistOffsetX - 20},${endY + waistOffsetY + 30} ${endX - waistOffsetX},${endY + waistOffsetY} ${endX - waistOffsetX + 20},${endY + waistOffsetY + 30}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <line
            x1={endX - waistOffsetX - 25}
            y1={endY + waistOffsetY + 30}
            x2={endX - waistOffsetX + 25}
            y2={endY + waistOffsetY + 30}
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
        
        {/* Dimensions */}
        {/* Span dimension */}
        <g className="text-muted-foreground">
          <line
            x1={offsetX - waistOffsetX}
            y1={offsetY + availableHeight + waistOffsetY + 50}
            x2={endX - waistOffsetX}
            y2={endY + waistOffsetY + 50 + (offsetY + availableHeight - endY)}
            stroke="currentColor"
            strokeWidth="1"
          />
          <text
            x={(offsetX + endX) / 2 - waistOffsetX}
            y={offsetY + availableHeight + waistOffsetY + 65}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            Effective Span = {spanLength}m
          </text>
        </g>
        
        {/* Waist thickness dimension */}
        <g className="text-muted-foreground">
          <line
            x1={offsetX + 60}
            y1={offsetY + availableHeight - 20}
            x2={offsetX + 60 - waistOffsetX}
            y2={offsetY + availableHeight + waistOffsetY - 20}
            stroke="currentColor"
            strokeWidth="1"
          />
          <text
            x={offsetX + 70}
            y={offsetY + availableHeight + waistOffsetY / 2 - 10}
            className="fill-muted-foreground text-xs"
          >
            h = {waistThickness}mm
          </text>
        </g>
        
        {/* Step dimensions */}
        <g className="text-muted-foreground">
          <text
            x={offsetX + scaledGoing / 2}
            y={offsetY + availableHeight - scaledRiser / 2}
            textAnchor="middle"
            className="fill-muted-foreground text-xs"
          >
            R={riserHeight}, G={goingLength}
          </text>
        </g>
        
        {/* Reinforcement labels */}
        <g>
          <text
            x={(offsetX + endX) / 2 - waistOffsetX}
            y={(offsetY + availableHeight + endY) / 2 + waistOffsetY + 20}
            textAnchor="middle"
            className="fill-destructive text-sm font-medium"
          >
            Main: {mainBars}
          </text>
        </g>
      </svg>
      
      {/* Detail section view */}
      <div className="mt-4 border-t border-border/30 pt-4">
        <p className="text-xs text-center mb-2 font-medium">Section Through Waist</p>
        <svg width="100%" height="120" viewBox="0 0 400 120" className="mx-auto">
          {/* Waist section */}
          <rect
            x="100"
            y="30"
            width="200"
            height={waistThickness * 0.3}
            fill="hsl(var(--muted))"
            stroke="currentColor"
            strokeWidth="2"
          />
          
          {/* Bottom reinforcement (main) */}
          {[...Array(6)].map((_, i) => (
            <circle
              key={`main-${i}`}
              cx={120 + i * 35}
              cy={30 + waistThickness * 0.3 - cover * 0.3 - 5}
              r="5"
              fill="hsl(var(--destructive))"
            />
          ))}
          
          {/* Distribution steel (smaller, shown as crosses) */}
          {[...Array(8)].map((_, i) => (
            <g key={`dist-${i}`}>
              <line
                x1={110 + i * 25 - 3}
                y1={30 + waistThickness * 0.3 - cover * 0.3 - 15}
                x2={110 + i * 25 + 3}
                y2={30 + waistThickness * 0.3 - cover * 0.3 - 15}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
              <line
                x1={110 + i * 25}
                y1={30 + waistThickness * 0.3 - cover * 0.3 - 18}
                x2={110 + i * 25}
                y2={30 + waistThickness * 0.3 - cover * 0.3 - 12}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
              />
            </g>
          ))}
          
          {/* Labels */}
          <text x="50" y={30 + waistThickness * 0.15} textAnchor="end" className="fill-muted-foreground text-xs">
            h = {waistThickness}mm
          </text>
          <text x="320" y={30 + waistThickness * 0.3 - 5} className="fill-destructive text-xs font-medium">
            {mainBars}
          </text>
          <text x="320" y={30 + waistThickness * 0.3 - 20} className="fill-primary text-xs font-medium">
            {distributionBars}
          </text>
        </svg>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Main Steel: {mainBars}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Distribution: {distributionBars}</span>
        </div>
      </div>
    </div>
  );
};
