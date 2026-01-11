import { useState } from "react";
import { Header } from "@/components/Header";
import { useCalculations, type Calculation } from "@/hooks/useCalculations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Star, 
  StarOff, 
  Trash2, 
  Calculator, 
  Clock, 
  Ruler, 
  Grid3X3, 
  GitBranch,
  Footprints,
  Columns,
  Loader2,
  FileText
} from "lucide-react";
import { format } from "date-fns";

const calculationTypeIcons = {
  beam: Ruler,
  slab: Grid3X3,
  column: Columns,
  continuous_beam: GitBranch,
  staircase: Footprints
};

const calculationTypeLabels = {
  beam: "RC Beam",
  slab: "RC Slab",
  column: "RC Column",
  continuous_beam: "Continuous Beam",
  staircase: "Staircase"
};

function CalculationCard({ 
  calculation, 
  onToggleFavorite, 
  onDelete 
}: { 
  calculation: Calculation;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = calculationTypeIcons[calculation.calculation_type] || Calculator;
  const typeLabel = calculationTypeLabels[calculation.calculation_type] || calculation.calculation_type;
  
  const resultData = calculation.result_data as { summary?: { designValid?: boolean } };
  const isValid = resultData?.summary?.designValid ?? true;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              isValid ? 'bg-primary/10' : 'bg-destructive/10'
            }`}>
              <Icon className={`h-5 w-5 ${isValid ? 'text-primary' : 'text-destructive'}`} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold line-clamp-1">
                {calculation.title}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {typeLabel}
                </Badge>
                {calculation.is_favorite && (
                  <Badge variant="default" className="text-xs bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Favorite
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(calculation.id)}
            >
              {calculation.is_favorite ? (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(calculation.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{format(new Date(calculation.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>
          <Badge variant={isValid ? "outline" : "destructive"} className="text-xs">
            {isValid ? "SAFE" : "REVIEW"}
          </Badge>
        </div>
        {!calculation.is_favorite && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            ⚠️ This calculation will be removed on next login
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyCalculations() {
  const { 
    calculations, 
    favorites, 
    favoriteCount, 
    loading, 
    toggleFavorite, 
    deleteCalculation 
  } = useCalculations();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const handleDelete = async () => {
    if (deleteId) {
      await deleteCalculation(deleteId);
      setDeleteId(null);
    }
  };

  const sessionCalculations = calculations.filter(c => !c.is_favorite);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Calculations</h1>
          <p className="text-muted-foreground">
            View and manage your saved calculations. Favorites persist across sessions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{calculations.length}</p>
                  <p className="text-xs text-muted-foreground">Total Calculations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{favoriteCount}/5</p>
                  <p className="text-xs text-muted-foreground">Favorites Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/80">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{sessionCalculations.length}</p>
                  <p className="text-xs text-muted-foreground">Session Only</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({calculations.length})</TabsTrigger>
            <TabsTrigger value="favorites">Favorites ({favoriteCount})</TabsTrigger>
            <TabsTrigger value="session">Session ({sessionCalculations.length})</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                {calculations.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No calculations yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Start by creating a beam, slab, or continuous beam design.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {calculations.map(calc => (
                      <CalculationCard
                        key={calc.id}
                        calculation={calc}
                        onToggleFavorite={toggleFavorite}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="favorites" className="space-y-4">
                {favorites.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No favorites yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Star a calculation to keep it permanently (up to 5).
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {favorites.map(calc => (
                      <CalculationCard
                        key={calc.id}
                        calculation={calc}
                        onToggleFavorite={toggleFavorite}
                        onDelete={setDeleteId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="session" className="space-y-4">
                {sessionCalculations.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-semibold mb-2">No session calculations</h3>
                      <p className="text-sm text-muted-foreground">
                        Temporary calculations appear here until you favorite them or log out.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm text-warning">
                      ⚠️ These calculations will be automatically deleted when you log out or start a new session.
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {sessionCalculations.map(calc => (
                        <CalculationCard
                          key={calc.id}
                          calculation={calc}
                          onToggleFavorite={toggleFavorite}
                          onDelete={setDeleteId}
                        />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calculation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The calculation will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
