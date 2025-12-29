import { Ruler } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center glow-steel">
              <Ruler className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">StructCalc</h1>
              <p className="text-xs text-muted-foreground">BS8110 Beam Design</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded bg-muted/50 font-mono">RC BEAM</span>
            <span className="px-2 py-1 rounded bg-muted/50 font-mono">BS8110</span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono">v1.0</span>
          </div>
        </div>
      </div>
    </header>
  );
}
