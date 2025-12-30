import { AlertTriangle, Lightbulb, ArrowUp, CheckCircle2 } from "lucide-react";
import type { DesignAdvice, DesignFailure } from "@/lib/designAdvisory";

interface DesignAdvisoryProps {
  status: 'passed' | 'failed';
  failures: DesignFailure[];
  advice: DesignAdvice[];
}

function EffectivenessIndicator({ level }: { level: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-success/20 text-success border-success/30',
    medium: 'bg-warning/20 text-warning border-warning/30',
    low: 'bg-muted text-muted-foreground border-border'
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${colors[level]}`}>
      {level}
    </span>
  );
}

function CategoryBadge({ category }: { category: 'geometry' | 'material' | 'layout' | 'reinforcement' }) {
  const icons = {
    geometry: '📐',
    material: '🧱',
    layout: '📋',
    reinforcement: '🔩'
  };
  
  return (
    <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded">
      {icons[category]} {category}
    </span>
  );
}

export function DesignAdvisory({ status, failures, advice }: DesignAdvisoryProps) {
  if (status === 'passed') {
    return (
      <div className="rounded-lg bg-success/10 border border-success/20 p-4">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Design Passed</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          All design checks satisfied. No modifications required.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Failure Summary */}
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
        <div className="flex items-center gap-2 text-destructive mb-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-semibold">Design Failed - {failures.length} Issue{failures.length > 1 ? 's' : ''} Found</span>
        </div>
        <ul className="space-y-2">
          {failures.map((failure, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-destructive mt-0.5">•</span>
              <div>
                <p className="text-foreground font-medium">{failure.description}</p>
                <p className="text-muted-foreground text-xs font-mono mt-0.5">
                  Current: {failure.currentValue.toFixed(failure.unit ? 2 : 4)} {failure.unit} → 
                  Limit: {failure.limitValue.toFixed(failure.unit ? 2 : 4)} {failure.unit}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Design Suggestions */}
      {advice.length > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
          <div className="flex items-center gap-2 text-primary mb-4">
            <Lightbulb className="h-5 w-5" />
            <span className="font-semibold">Recommended Actions</span>
            <span className="text-xs text-muted-foreground ml-auto">Ranked by effectiveness</span>
          </div>
          
          <div className="space-y-3">
            {advice.map((item, i) => (
              <div 
                key={i} 
                className="bg-background/50 rounded-lg p-3 border border-border/50 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-medium text-foreground">{item.action}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{item.reason}</p>
                    <div className="flex items-center gap-2">
                      <EffectivenessIndicator level={item.effectiveness} />
                      <CategoryBadge category={item.category} />
                    </div>
                  </div>
                  <ArrowUp className="h-4 w-4 text-success flex-shrink-0" />
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/30">
            💡 These are suggestions only. Review carefully before applying changes. 
            User must approve all modifications.
          </p>
        </div>
      )}
    </div>
  );
}
