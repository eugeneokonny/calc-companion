import { Ruler, Grid3X3, GitBranch, HelpCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "RC Beam", icon: Ruler },
    { path: "/slab", label: "RC Slab", icon: Grid3X3 },
    { path: "/continuous-beam", label: "Continuous Beam", icon: GitBranch },
  ];
  
  return (
    <header className="border-b border-border/40 bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <Ruler className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-foreground">StructCalc</h1>
              <p className="text-xs text-muted-foreground">BS8110 Design Assistant</p>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="flex items-center gap-1.5">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  location.pathname === path
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <div className="w-px h-6 bg-border mx-2" />
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-muted text-muted-foreground">
              v1.1
            </span>
          </nav>
        </div>
      </div>
    </header>
  );
}