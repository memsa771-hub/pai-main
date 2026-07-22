"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { User } from "@/types/common";

export function useAuthenticatedUser() {
  const supabase = createClient();

  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw error;
      return data.user;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: async () => {
      const { apiClient } = await import("@/lib/api/client");
      return apiClient<User>("/api/profile");
    },
    staleTime: 5 * 60 * 1000,
  });
}