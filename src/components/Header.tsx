import { Ruler, Grid3X3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "RC BEAM", icon: Ruler },
    { path: "/slab", label: "RC SLAB", icon: Grid3X3 },
  ];

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center glow-steel">
                <Ruler className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight">StructCalc</h1>
                <p className="text-xs text-muted-foreground">BS8110 Design</p>
              </div>
            </Link>
          </div>
          
          <nav className="flex items-center gap-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                  location.pathname === path
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-mono text-xs ml-2">
              v1.0
            </span>
          </nav>
        </div>
      </div>
    </header>
  );
}
