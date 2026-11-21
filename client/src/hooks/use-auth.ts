import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";

type SafeUser = Omit<User, "password"> & { effectivePermissions?: string[]; isPlatformAdmin?: boolean };

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", { email, password });
      return res.json();
    },
    onSuccess: (user: SafeUser) => {
      // Browser query data can contain rows from the previously signed-in
      // clinic. Clear it before the new tenant's screens load.
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "/api/auth/me",
      });
      queryClient.setQueryData(["/api/auth/me"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.invalidateQueries();
    },
  });

  const hasPermission = (...permissions: string[]) => {
    if (!user?.effectivePermissions) return false;
    return permissions.some((p) => user.effectivePermissions!.includes(p));
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.isPlatformAdmin === true,
    hasPermission,
    login: loginMutation,
    logout: logoutMutation,
  };
}
