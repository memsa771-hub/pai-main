import { createClient } from "@/lib/supabase/client";

/**
 * Retrieves the current Supabase access token for FastAPI authorization.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Synchronously retrieves a stored token (fallback for non-React contexts).
 * This should only be used when getAccessToken() is not possible.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("placement-ai-token");
}