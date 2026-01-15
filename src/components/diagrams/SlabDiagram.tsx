import React from 'react';

interface SlabDiagramProps {
  thickness: number;
  shortSpan: number;
  longSpan?: number;
  cover: number;
  bottomShortBars?: string;
  bottomLongBars?: string;
  topShortBars?: string;
  topLongBars?: string;
  slabType: 'One-Way Slab' | 'Two-Way Slab';
}

export const SlabDiagram: React.FC<SlabDiagramProps> = ({
  thickness,
  shortSpan,
  longSpan,
  cover,
  bottomShortBars = "T10@200",
  bottomLongBars,
  topShortBars,
  topLongBars,
  slabType,
}) => {
  const isTwoWay = slabType === 'Two-Way Slab';
  
  // Section view dimensions
  const sectionWidth = 300;
  const sectionHeight = 150;
  const offsetX = 60;
  const offsetY = 50;
  
  const scaledThickness = Math.min(thickness * 0.3, 80);
  const barRadius = 4;
  
  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
      <h4 className="font-semibold text-sm mb-3 text-center">Slab Reinforcement Layout</h4>
      
      <div className="grid md:grid-cols-2 gap-4">
        {/* Plan View */}
        <div className="border border-border/30 rounded p-3">
          <p className="text-xs text-center mb-2 font-medium">Plan View (Bottom Reinforcement)</p>
          <svg width="100%" height="180" viewBox="0 0 280 180">
            {/* Slab outline */}
            <rect
              x="40"
              y="20"
              width="200"
              height="140"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            
            {/* Short span bars (bottom layer - primary for one-way) */}
            <g stroke="hsl(var(--destructive))" strokeWidth="2">
              {[...Array(8)].map((_, i) => (
                <line
                  key={`short-${i}`}
                  x1="50"
                  y1={35 + i * 18}
                  x2="230"
                  y2={35 + i * 18}
                  strokeDasharray={i % 2 === 0 ? "none" : "5,5"}
                />
              ))}
            </g>
            
            {/* Long span bars (bottom layer - secondary, on top) */}
            {isTwoWay && (
              <g stroke="hsl(var(--primary))" strokeWidth="2">
                {[...Array(10)].map((_, i) => (
                  <line
                    key={`long-${i}`}
                    x1={55 + i * 20}
                    y1="30"
                    x2={55 + i * 20}
                    y2="150"
                    strokeDasharray={i % 2 === 0 ? "none" : "5,5"}
                  />
                ))}
              </g>
            )}
            
            {/* Span direction arrows */}
            <g className="text-muted-foreground">
              <text x="140" y="175" textAnchor="middle" className="fill-destructive text-xs">
                Short Span (lx)
              </text>
              <text x="260" y="90" textAnchor="middle" transform="rotate(90, 260, 90)" className="fill-primary text-xs">
                {isTwoWay ? "Long Span (ly)" : "Distribution"}
              </text>
            </g>
          </svg>
        </div>
        
        {/* Section View */}
        <div className="border border-border/30 rounded p-3">
          <p className="text-xs text-center mb-2 font-medium">Section A-A (Through Short Span)</p>
          <svg width="100%" height="180" viewBox="0 0 280 180">
            {/* Slab section */}
            <rect
              x={offsetX}
              y={offsetY}
              width={sectionWidth - 2 * offsetX}
              height={scaledThickness}
              fill="hsl(var(--muted))"
              stroke="currentColor"
              strokeWidth="2"
              className="text-foreground"
            />
            
            {/* Cover zone (dashed) */}
            <rect
              x={offsetX + 5}
              y={offsetY + cover * 0.3}
              width={sectionWidth - 2 * offsetX - 10}
              height={scaledThickness - 2 * cover * 0.3}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3,3"
              className="text-muted-foreground"
            />
            
            {/* Bottom reinforcement (short span - main) */}
            <g fill="hsl(var(--destructive))">
              {[...Array(6)].map((_, i) => (
                <circle
                  key={`bottom-${i}`}
                  cx={offsetX + 20 + i * 28}
                  cy={offsetY + scaledThickness - cover * 0.3 - barRadius}
                  r={barRadius}
                />
              ))}
            </g>
            
            {/* Top reinforcement (if continuous) */}
            {topShortBars && (
              <g fill="hsl(var(--warning))">
                {[...Array(4)].map((_, i) => (
                  <circle
                    key={`top-${i}`}
                    cx={offsetX + 30 + i * 40}
                    cy={offsetY + cover * 0.3 + barRadius}
                    r={barRadius}
                  />
                ))}
              </g>
            )}
            
            {/* Long span bars shown as crosses (perpendicular) */}
            {isTwoWay && (
              <g stroke="hsl(var(--primary))" strokeWidth="2">
                {[...Array(6)].map((_, i) => (
                  <g key={`cross-${i}`}>
                    <line
                      x1={offsetX + 20 + i * 28 - 3}
                      y1={offsetY + scaledThickness - cover * 0.3 - barRadius - 10}
                      x2={offsetX + 20 + i * 28 + 3}
                      y2={offsetY + scaledThickness - cover * 0.3 - barRadius - 10}
                    />
                    <line
                      x1={offsetX + 20 + i * 28}
                      y1={offsetY + scaledThickness - cover * 0.3 - barRadius - 13}
                      x2={offsetX + 20 + i * 28}
                      y2={offsetY + scaledThickness - cover * 0.3 - barRadius - 7}
                    />
                  </g>
                ))}
              </g>
            )}
            
            {/* Dimension - thickness */}
            <g className="text-muted-foreground">
              <line x1="40" y1={offsetY} x2="40" y2={offsetY + scaledThickness} stroke="currentColor" strokeWidth="1" />
              <line x1="35" y1={offsetY} x2="45" y2={offsetY} stroke="currentColor" strokeWidth="1" />
              <line x1="35" y1={offsetY + scaledThickness} x2="45" y2={offsetY + scaledThickness} stroke="currentColor" strokeWidth="1" />
              <text x="25" y={offsetY + scaledThickness / 2} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs" transform={`rotate(-90, 25, ${offsetY + scaledThickness / 2})`}>
                h={thickness}mm
              </text>
            </g>
            
            {/* Cover dimension */}
            <line
              x1={sectionWidth - offsetX + 5}
              y1={offsetY + scaledThickness - cover * 0.3}
              x2={sectionWidth - offsetX + 15}
              y2={offsetY + scaledThickness - cover * 0.3}
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
            <text
              x={sectionWidth - offsetX + 20}
              y={offsetY + scaledThickness - cover * 0.15}
              className="fill-muted-foreground text-xs"
            >
              c={cover}mm
            </text>
          </svg>
        </div>
      </div>
      
      {/* Reinforcement Legend */}
      <div className="mt-4 p-3 bg-background/50 rounded border border-border/30">
        <p className="text-xs font-semibold mb-2">Reinforcement Summary:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Short Span (Bottom): {bottomShortBars}</span>
          </div>
          {isTwoWay && bottomLongBars && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Long Span (Bottom): {bottomLongBars}</span>
            </div>
          )}
          {topShortBars && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Short Span (Top): {topShortBars}</span>
            </div>
          )}
          {topLongBars && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400" />
              <span>Long Span (Top): {topLongBars}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
