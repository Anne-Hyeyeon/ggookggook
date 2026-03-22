import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

export const useFavorites = () => {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFavoriteIds([]);
      return;
    }
    const fetchFavorites = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("favorites")
        .select("acupoint_id")
        .eq("user_id", user.id);
      setFavoriteIds(data?.map((f) => f.acupoint_id) ?? []);
      setIsLoading(false);
    };
    fetchFavorites();
  }, [user]);

  const toggleFavorite = useCallback(async (acupointId: string) => {
    if (!user) return;
    const supabase = createClient();
    const isFavorited = favoriteIds.includes(acupointId);

    // Optimistic update
    setFavoriteIds((prev) =>
      isFavorited ? prev.filter((id) => id !== acupointId) : [...prev, acupointId]
    );

    if (isFavorited) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("acupoint_id", acupointId);
    } else {
      await supabase
        .from("favorites")
        .insert({ user_id: user.id, acupoint_id: acupointId });
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback(
    (acupointId: string) => favoriteIds.includes(acupointId),
    [favoriteIds]
  );

  return { favoriteIds, isLoading, toggleFavorite, isFavorite };
};
