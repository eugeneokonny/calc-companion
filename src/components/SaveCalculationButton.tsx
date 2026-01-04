import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Star, Loader2 } from "lucide-react";
import { useCalculations } from "@/hooks/useCalculations";
import type { Database } from '@/integrations/supabase/types';

type CalculationType = Database['public']['Enums']['calculation_type'];

interface SaveCalculationButtonProps {
  calculationType: CalculationType;
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  defaultTitle?: string;
  disabled?: boolean;
}

export function SaveCalculationButton({
  calculationType,
  inputData,
  resultData,
  defaultTitle = "",
  disabled = false
}: SaveCalculationButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const { saveCalculation, favoriteCount } = useCalculations();

  const handleSave = async () => {
    if (!title.trim()) return;
    
    setSaving(true);
    const result = await saveCalculation({
      calculationType,
      title: title.trim(),
      inputData,
      resultData,
      isFavorite
    });
    setSaving(false);
    
    if (result) {
      setOpen(false);
      setTitle(defaultTitle);
      setIsFavorite(false);
    }
  };

  const canAddFavorite = favoriteCount < 5;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Give your calculation a name. Mark as favorite to keep it permanently (up to 5).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Calculation Name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Ground Floor Beam B1"
              autoFocus
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="favorite"
              checked={isFavorite}
              onCheckedChange={(checked) => setIsFavorite(checked === true)}
              disabled={!canAddFavorite}
            />
            <Label 
              htmlFor="favorite" 
              className="flex items-center gap-2 cursor-pointer"
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
              Add to favorites ({favoriteCount}/5)
            </Label>
          </div>
          {!canAddFavorite && (
            <p className="text-xs text-muted-foreground">
              You've reached the maximum of 5 favorites. Remove one to add more.
            </p>
          )}
          {!isFavorite && (
            <p className="text-xs text-muted-foreground italic">
              ⚠️ Non-favorite calculations will be deleted when you log out.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Calculation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
