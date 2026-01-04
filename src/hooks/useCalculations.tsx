import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type CalculationType = Database['public']['Enums']['calculation_type'];

export interface Calculation {
  id: string;
  user_id: string;
  calculation_type: CalculationType;
  title: string;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown>;
  is_favorite: boolean;
  session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseCalculationsReturn {
  calculations: Calculation[];
  favorites: Calculation[];
  favoriteCount: number;
  loading: boolean;
  error: string | null;
  saveCalculation: (params: SaveCalculationParams) => Promise<Calculation | null>;
  toggleFavorite: (id: string) => Promise<boolean>;
  deleteCalculation: (id: string) => Promise<boolean>;
  cleanupTemporaryCalculations: () => Promise<number>;
  refetch: () => Promise<void>;
}

interface SaveCalculationParams {
  calculationType: CalculationType;
  title: string;
  inputData: Record<string, unknown>;
  resultData: Record<string, unknown>;
  isFavorite?: boolean;
}

// Generate session ID for temporary calculations
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('calc_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('calc_session_id', sessionId);
  }
  return sessionId;
};

export function useCalculations(): UseCalculationsReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalculations = useCallback(async () => {
    if (!user) {
      setCalculations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('calculations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setCalculations((data as Calculation[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch calculations';
      setError(message);
      console.error('Error fetching calculations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  // Clean up temporary calculations on login
  useEffect(() => {
    if (user) {
      const cleanup = async () => {
        try {
          await supabase.rpc('cleanup_temporary_calculations', { _user_id: user.id });
        } catch (err) {
          console.error('Error cleaning up temporary calculations:', err);
        }
      };
      cleanup();
    }
  }, [user]);

  const saveCalculation = async (params: SaveCalculationParams): Promise<Calculation | null> => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save calculations.",
        variant: "destructive"
      });
      return null;
    }

    try {
      const sessionId = getSessionId();
      
      const insertData = {
        user_id: user.id,
        calculation_type: params.calculationType,
        title: params.title,
        input_data: params.inputData as unknown as Database['public']['Tables']['calculations']['Insert']['input_data'],
        result_data: params.resultData as unknown as Database['public']['Tables']['calculations']['Insert']['result_data'],
        is_favorite: params.isFavorite || false,
        session_id: sessionId
      };
      
      const { data, error: insertError } = await supabase
        .from('calculations')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('Maximum of 5 favorites')) {
          toast({
            title: "Favorite Limit Reached",
            description: "You can only have 5 favorites. Please remove one first.",
            variant: "destructive"
          });
        } else {
          throw insertError;
        }
        return null;
      }

      setCalculations(prev => [data as Calculation, ...prev]);
      
      toast({
        title: "Calculation Saved",
        description: params.isFavorite 
          ? "Calculation saved to favorites!" 
          : "Calculation saved for this session.",
      });

      return data as Calculation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save calculation';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      return null;
    }
  };

  const toggleFavorite = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const calculation = calculations.find(c => c.id === id);
    if (!calculation) return false;

    const newFavoriteStatus = !calculation.is_favorite;

    // Check if we're at the limit
    if (newFavoriteStatus && favorites.length >= 5) {
      toast({
        title: "Favorite Limit Reached",
        description: "You can only have 5 favorites. Please remove one first.",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('calculations')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) {
        if (updateError.message.includes('Maximum of 5 favorites')) {
          toast({
            title: "Favorite Limit Reached",
            description: "You can only have 5 favorites. Please remove one first.",
            variant: "destructive"
          });
        } else {
          throw updateError;
        }
        return false;
      }

      setCalculations(prev => 
        prev.map(c => c.id === id ? { ...c, is_favorite: newFavoriteStatus } : c)
      );

      toast({
        title: newFavoriteStatus ? "Added to Favorites" : "Removed from Favorites",
        description: newFavoriteStatus 
          ? "Calculation will persist across sessions." 
          : "Calculation will be removed on next login.",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update favorite';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      return false;
    }
  };

  const deleteCalculation = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('calculations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      setCalculations(prev => prev.filter(c => c.id !== id));
      
      toast({
        title: "Calculation Deleted",
        description: "The calculation has been removed.",
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete calculation';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
      return false;
    }
  };

  const cleanupTemporaryCalculations = async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data, error: rpcError } = await supabase
        .rpc('cleanup_temporary_calculations', { _user_id: user.id });

      if (rpcError) throw rpcError;

      await fetchCalculations();
      
      const count = typeof data === 'number' ? data : 0;
      
      if (count > 0) {
        toast({
          title: "Cleanup Complete",
          description: `${count} temporary calculation(s) removed.`,
        });
      }

      return count;
    } catch (err) {
      console.error('Error cleaning up calculations:', err);
      return 0;
    }
  };

  const favorites = calculations.filter(c => c.is_favorite);
  const favoriteCount = favorites.length;

  return {
    calculations,
    favorites,
    favoriteCount,
    loading,
    error,
    saveCalculation,
    toggleFavorite,
    deleteCalculation,
    cleanupTemporaryCalculations,
    refetch: fetchCalculations
  };
}
