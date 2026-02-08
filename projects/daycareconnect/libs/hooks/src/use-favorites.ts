import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { favoritesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useFavorites() {
  return useQuery({
    queryKey: queryKeys.favorites.all,
    queryFn: () => favoritesService.getMyFavorites(),
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: favoritesService.toggleFavorite,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.favorites.all });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
