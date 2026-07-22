import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeApiError, ApiRequestError } from "./errors";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Server-side API client for use in Server Components and Route Handlers.
 * Uses Supabase server client to get the access token.
 */
export async function serverApiClient<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}