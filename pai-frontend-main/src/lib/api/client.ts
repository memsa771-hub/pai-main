import { getAccessToken, getStoredToken } from "./auth-token";
import { normalizeApiError, ApiRequestError } from "./errors";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
};

/**
 * Typed API client for all FastAPI requests.
 * Passes Supabase access token as Bearer authorization.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    body,
    params,
    timeout = 30000,
    headers: extraHeaders,
    ...rest
  } = options;

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  // Get auth token
  let token: string | null = null;
  try {
    token = await getAccessToken();
  } catch {
    token = getStoredToken();
  }

  // Build headers
  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Determine request body
  let requestBody: BodyInit | undefined;
  if (body !== undefined) {
    if (body instanceof FormData) {
      requestBody = body;
      // Let the browser set Content-Type with boundary
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  // Set up AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...rest,
      headers,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw await normalizeApiError(response);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return (await response.json()) as T;
    }

    // Return blob for non-JSON responses
    return (await response.blob()) as unknown as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiRequestError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiRequestError({
        status: 408,
        code: "TIMEOUT",
        message: "The request took too long. Please try again.",
      });
    }

    throw new ApiRequestError({
      status: 0,
      code: "NETWORK_ERROR",
      message:
        "Unable to connect to the server. Please check your connection.",
    });
  }
}

/**
 * Upload a file to the FastAPI backend with progress tracking.
 */
export async function apiUpload<T = unknown>(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void,
  additionalFields?: Record<string, string>,
): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  let token: string | null = null;
  try {
    token = await getAccessToken();
  } catch {
    token = getStoredToken();
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Use XMLHttpRequest for upload progress tracking
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as T);
          } catch {
            resolve(xhr.responseText as unknown as T);
          }
        } else {
          let body: Record<string, unknown> = {};
          try {
            body = JSON.parse(xhr.responseText);
          } catch {
            // ignore
          }
          reject(
            new ApiRequestError({
              status: xhr.status,
              code: (body.code as string) || "UPLOAD_ERROR",
              message:
                (body.message as string) ||
                (body.detail as string) ||
                "File upload failed.",
            }),
          );
        }
      });

      xhr.addEventListener("error", () => {
        reject(
          new ApiRequestError({
            status: 0,
            code: "NETWORK_ERROR",
            message: "Network error during upload.",
          }),
        );
      });

      xhr.send(formData);
    });
  }

  // Fallback to fetch without progress tracking
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw await normalizeApiError(response);
  }

  return (await response.json()) as T;
}