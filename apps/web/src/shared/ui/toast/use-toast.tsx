"use client";

import { useCallback, useState } from "react";

export type Toast = { id: string; message: string; kind?: "success" | "error" | "info" };

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, ...t };
    setToasts((x) => [...x, toast]);

    window.setTimeout(() => {
      setToasts((x) => x.filter((y) => y.id !== id));
    }, 3000);
  }, []);

  const ToastHost = useCallback(() => {
    return (
      <div className="fixed right-4 top-4 z-50 grid gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-xl border bg-background px-3 py-2 text-sm shadow-sm",
              t.kind === "success" ? "border-emerald-300" : "",
              t.kind === "error" ? "border-rose-300" : "",
            ].join(" ")}
          >
            {t.message}
          </div>
        ))}
      </div>
    );
  }, [toasts]);

  return { push, ToastHost };
}
