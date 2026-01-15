import React from 'react';

interface SpanInfo {
  spanIndex: number;
  length: number;
  topSteel?: string;
  bottomSteel?: string;
  links?: string;
  positiveMoment: number;
  negativeMomentLeft: number;
  negativeMomentRight: number;
}

interface ContinuousBeamDiagramProps {
  spans: SpanInfo[];
  width: number;
  depth: number;
  cover: number;
}

export const ContinuousBeamDiagram: React.FC<ContinuousBeamDiagramProps> = ({
  spans,
  width,
  depth,
  cover,
}) => {
  const totalLength = spans.reduce((sum, span) => sum + span.length, 0);
  const svgWidth = 800;
  const svgHeight = 280;
  const elevationHeight = 80;
  const momentDiagramHeight = 80;
  const offsetX = 50;
  const offsetY = 40;
  
  const scale = (svgWidth - 2 * offsetX) / totalLength;
  
  // Calculate support positions
  const supportPositions: number[] = [offsetX];
  let currentX = offsetX;
  spans.forEach(span => {
    currentX += span.length * scale;
    supportPositions.push(currentX);
  });

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">Continuous Beam - Elevation & Moment Diagram</h4>
      
      <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="mx-auto">
        {/* BEAM ELEVATION */}
        <g>
          <text x={offsetX - 10} y={offsetY + elevationHeight / 2} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-xs">
            Elevation
          </text>
          
          {/* Main beam line */}
          <rect
            x={offsetX}
            y={offsetY}
            width={svgWidth - 2 * offsetX}
            height={elevationHeight}
            fill="hsl(var(--muted))"
            stroke="currentColor"
            strokeWidth="2"
            className="text-foreground"
          />
          
          {/* Supports */}
          {supportPositions.map((x, i) => (
            <g key={`support-${i}`}>
              {/* Triangle support */}
              <polygon
                points={`${x},${offsetY + elevationHeight} ${x - 15},${offsetY + elevationHeight + 25} ${x + 15},${offsetY + elevationHeight + 25}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
              {/* Ground line */}
              <line
                x1={x - 20}
                y1={offsetY + elevationHeight + 25}
                x2={x + 20}
                y2={offsetY + elevationHeight + 25}
                stroke="currentColor"
                strokeWidth="2"
              />
              {/* Hatching */}
              {[...Array(4)].map((_, j) => (
                <line
                  key={j}
                  x1={x - 15 + j * 8}
                  y1={offsetY + elevationHeight + 25}
                  x2={x - 20 + j * 8}
                  y2={offsetY + elevationHeight + 32}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              ))}
              <text
                x={x}
                y={offsetY + elevationHeight + 45}
                textAnchor="middle"
                className="fill-muted-foreground text-xs"
              >
                S{i + 1}
              </text>
            </g>
          ))}
          
          {/* Span labels with reinforcement */}
          {spans.map((span, i) => {
            const startX = supportPositions[i];
            const endX = supportPositions[i + 1];
            const midX = (startX + endX) / 2;
            
            return (
              <g key={`span-${i}`}>
                {/* Span length dimension */}
                <line
                  x1={startX}
                  y1={offsetY - 10}
                  x2={endX}
                  y2={offsetY - 10}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-muted-foreground"
                />
                <line x1={startX} y1={offsetY - 15} x2={startX} y2={offsetY - 5} stroke="currentColor" strokeWidth="1" />
                <line x1={endX} y1={offsetY - 15} x2={endX} y2={offsetY - 5} stroke="currentColor" strokeWidth="1" />
                <text
                  x={midX}
                  y={offsetY - 18}
                  textAnchor="middle"
                  className="fill-foreground text-xs font-medium"
                >
                  Span {span.spanIndex} = {span.length}m
                </text>
                
                {/* Top steel indicator at supports (negative moment) */}
                <line
                  x1={startX + 10}
                  y1={offsetY + 15}
                  x2={midX - 20}
                  y2={offsetY + 15}
                  stroke="hsl(var(--warning))"
                  strokeWidth="3"
                />
                <line
                  x1={midX + 20}
                  y1={offsetY + 15}
                  x2={endX - 10}
                  y2={offsetY + 15}
                  stroke="hsl(var(--warning))"
                  strokeWidth="3"
                />
                
                {/* Bottom steel indicator at mid-span (positive moment) */}
                <line
                  x1={startX + 20}
                  y1={offsetY + elevationHeight - 15}
                  x2={endX - 20}
                  y2={offsetY + elevationHeight - 15}
                  stroke="hsl(var(--destructive))"
                  strokeWidth="3"
                />
                
                {/* Reinforcement labels */}
                <text
                  x={midX}
                  y={offsetY + 30}
                  textAnchor="middle"
                  className="fill-warning text-xs font-medium"
                >
                  Top: {span.topSteel || `${Math.ceil(Math.max(span.negativeMomentLeft, span.negativeMomentRight) / 50)}T20`}
                </text>
                <text
                  x={midX}
                  y={offsetY + elevationHeight - 25}
                  textAnchor="middle"
                  className="fill-destructive text-xs font-medium"
                >
                  Bot: {span.bottomSteel || `${Math.ceil(span.positiveMoment / 50)}T20`}
                </text>
              </g>
            );
          })}
        </g>
        
        {/* BENDING MOMENT DIAGRAM */}
        <g transform={`translate(0, ${offsetY + elevationHeight + 70})`}>
          <text x={offsetX - 10} y={momentDiagramHeight / 2} textAnchor="end" dominantBaseline="middle" className="fill-muted-foreground text-xs">
            BMD
          </text>
          
          {/* Baseline */}
          <line
            x1={offsetX}
            y1={0}
            x2={svgWidth - offsetX}
            y2={0}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4,4"
            className="text-muted-foreground"
          />
          
          {/* Moment curves for each span */}
          {spans.map((span, i) => {
            const startX = supportPositions[i];
            const endX = supportPositions[i + 1];
            const midX = (startX + endX) / 2;
            
            const maxMoment = Math.max(
              Math.abs(span.positiveMoment),
              Math.abs(span.negativeMomentLeft),
              Math.abs(span.negativeMomentRight)
            );
            const momentScale = (momentDiagramHeight * 0.8) / (maxMoment || 1);
            
            const leftY = -span.negativeMomentLeft * momentScale * 0.5;
            const midY = span.positiveMoment * momentScale * 0.5;
            const rightY = -span.negativeMomentRight * momentScale * 0.5;
            
            return (
              <g key={`moment-${i}`}>
                {/* Moment curve (parabolic approximation) */}
                <path
                  d={`M ${startX},${leftY} Q ${midX},${midY} ${endX},${rightY}`}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                
                {/* Fill positive moment area */}
                <path
                  d={`M ${startX},0 L ${startX},${leftY} Q ${midX},${midY} ${endX},${rightY} L ${endX},0 Z`}
                  fill="hsl(var(--primary) / 0.2)"
                  stroke="none"
                />
                
                {/* Moment values */}
                {span.negativeMomentLeft > 0 && (
                  <text
                    x={startX + 15}
                    y={leftY - 8}
                    className="fill-warning text-xs font-mono"
                  >
                    -{span.negativeMomentLeft.toFixed(0)}
                  </text>
                )}
                <text
                  x={midX}
                  y={midY + 15}
                  textAnchor="middle"
                  className="fill-success text-xs font-mono"
                >
                  +{span.positiveMoment.toFixed(0)}
                </text>
                {span.negativeMomentRight > 0 && (
                  <text
                    x={endX - 15}
                    y={rightY - 8}
                    textAnchor="end"
                    className="fill-warning text-xs font-mono"
                  >
                    -{span.negativeMomentRight.toFixed(0)}
                  </text>
                )}
              </g>
            );
          })}
          
          <text x={svgWidth - offsetX + 10} y={0} dominantBaseline="middle" className="fill-muted-foreground text-xs">
            kNm
          </text>
        </g>
      </svg>
      
      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-8 h-1 bg-destructive" />
          <span>Bottom Steel (Tension at mid-span)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-8 h-1 bg-warning" />
          <span>Top Steel (Tension at supports)</span>
        </div>
      </div>
    </div>
  );
};
