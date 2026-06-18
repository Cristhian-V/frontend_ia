"use client";

import { useState, useRef, useCallback } from "react";
import { api } from "@/lib/api";
import type { Progress } from "@/lib/types";

interface UseUploadProgressOptions {
  onReady?: () => void;
}

export function useUploadProgress({ onReady }: UseUploadProgressOptions = {}) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (docId: string) => {
      stopPolling();

      pollingRef.current = setInterval(async () => {
        try {
          const p = await api.documents.progress(docId);
          setProgress(p);

          if (p.status === "ready" || p.status === "error") {
            stopPolling();
            if (p.status === "ready") {
              timeoutRef.current = setTimeout(() => {
                setProgress(null);
                onReady?.();
              }, 1500);
            }
          }
        } catch {
          stopPolling();
        }
      }, 3000);
    },
    [stopPolling, onReady]
  );

  const reset = useCallback(() => {
    stopPolling();
    setProgress(null);
  }, [stopPolling]);

  return { progress, startPolling, stopPolling, reset };
}
