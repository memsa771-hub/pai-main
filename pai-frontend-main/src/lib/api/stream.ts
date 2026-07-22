import { getAccessToken, getStoredToken } from "./auth-token";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type StreamEventType = "status" | "token" | "metadata" | "complete" | "error";

export type StreamEvent = {
  type: StreamEventType;
  data: string;
};

export type StreamMetadata = {
  quick_replies?: string[];
  sources?: Array<{ title: string; url: string }>;
  recommendations?: Array<Record<string, unknown>>;
  session_id?: string;
  message_id?: string;
};

export type StreamHandlers = {
  onStatus?: (message: string) => void;
  onToken?: (text: string) => void;
  onMetadata?: (metadata: StreamMetadata) => void;
  onComplete?: (data: { session_id?: string; message_id?: string }) => void;
  onError?: (error: string) => void;
};

/**
 * Parses SSE (Server-Sent Events) stream from the FastAPI backend.
 * Handles partial chunks, multiple events in one chunk, and connection errors.
 */
function parseSSEStream(
  chunk: string,
  handlers: StreamHandlers,
  buffer: { current: string },
): void {
  buffer.current += chunk;
  const lines = buffer.current.split("\n");
  // Keep the last potentially incomplete line in the buffer
  buffer.current = lines.pop() ?? "";

  let currentEventType: StreamEventType | null = null;

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      currentEventType = line.slice(7).trim() as StreamEventType;
    } else if (line.startsWith("data: ")) {
      const rawData = line.slice(6);
      if (!currentEventType) continue;

      try {
        const parsed = JSON.parse(rawData);

        switch (currentEventType) {
          case "status":
            handlers.onStatus?.(parsed.message ?? rawData);
            break;
          case "token":
            handlers.onToken?.(parsed.text ?? rawData);
            break;
          case "metadata":
            handlers.onMetadata?.(parsed as StreamMetadata);
            break;
          case "complete":
            handlers.onComplete?.(parsed);
            break;
          case "error":
            handlers.onError?.(parsed.message ?? "Unknown streaming error");
            break;
        }
      } catch {
        // If parsing fails, try to use raw data for token events
        if (currentEventType === "token") {
          handlers.onToken?.(rawData);
        }
      }
    }
    // Empty lines (event separators) are ignored
  }
}

/**
 * Stream a chat message to the FastAPI backend and receive SSE events.
 */
export async function streamChatMessage(
  sessionId: string | null,
  text: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let token: string | null = null;
  try {
    token = await getAccessToken();
  } catch {
    token = getStoredToken();
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/chat/stream`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      text,
      session_id: sessionId,
    }),
    signal,
  });

  if (!response.ok) {
    handlers.onError?.(`Request failed with status ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError?.("Stream not available");
    return;
  }

  const decoder = new TextDecoder();
  const buffer = { current: "" };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      parseSSEStream(chunk, handlers, buffer);
    }

    // Process any remaining data in the buffer
    if (buffer.current.trim()) {
      parseSSEStream("\n", handlers, buffer);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      // Stream was cancelled - this is expected
      return;
    }
    handlers.onError?.(
      error instanceof Error ? error.message : "Streaming error",
    );
  } finally {
    reader.releaseLock();
  }
}

/**
 * Creates an AbortController for cancelling a stream.
 */
export function createStreamController(): AbortController {
  return new AbortController();
}