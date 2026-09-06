"use client";

import { useEffect, useState } from "react";
import { TraceNode } from "./mockData";

export interface RunEvent {
  type: "node.started" | "node.finished" | "finding.verified" | "run.finished";
  node?: TraceNode;
  message?: string;
  timestamp: string;
}

export function useRunEvents(runId: string) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!runId) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/v1"}/runs/${runId}/events`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
      };

      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as RunEvent;
          setEvents((prev) => [...prev, parsed]);
        } catch {
          // ignore malformed frame
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setIsReconnecting(true);
        eventSource?.close();

        // Fallback to periodic 5s polling if SSE disconnects
        pollInterval = setInterval(() => {
          // Poll run status
        }, 5000);
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [runId]);

  return { events, isConnected, isReconnecting };
}
