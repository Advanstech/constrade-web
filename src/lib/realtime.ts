import { API_BASE_URL, getAccessToken } from "./apiClient";

export interface RealtimeEvent {
  event: "connected" | "heartbeat" | "market" | "notification" | "order";
  data?: unknown;
}

export interface MarketTick {
  ticker: string;
  price: number;
  previousClose: number | null;
  volume: number;
}

/**
 * Subscribes to the server-sent realtime stream using fetch (EventSource
 * cannot send Authorization headers). Auto-reconnects with backoff and
 * stops cleanly when the returned unsubscribe function is called.
 */
export function subscribeEvents(
  onEvent: (e: RealtimeEvent) => void,
): () => void {
  const controller = new AbortController();
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let retryMs = 2000;

  const schedule = () => {
    if (closed) return;
    timer = setTimeout(connect, retryMs);
    retryMs = Math.min(retryMs * 1.5, 30_000);
  };

  const connect = async () => {
    const token = getAccessToken();
    if (!token) {
      schedule();
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/events/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`);

      retryMs = 2000; // healthy connection — reset backoff
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!closed) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            onEvent(JSON.parse(dataLine.slice(5).trim()) as RealtimeEvent);
          } catch {
            // malformed frame — ignore
          }
        }
      }
    } catch {
      // aborted or network error — fall through to reconnect
    }
    schedule();
  };

  void connect();

  return () => {
    closed = true;
    if (timer) clearTimeout(timer);
    controller.abort();
  };
}
