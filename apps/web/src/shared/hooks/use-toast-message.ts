"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ToastKind = "error" | "success" | "info" | "warning";

type UseToastMessageOptions = {
  kind?: ToastKind;
  skip?: boolean;
};

const TOAST_HANDLERS = {
  error: toast.error,
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
} as const;

export function useToastMessage(
  message: string | null | undefined,
  options: UseToastMessageOptions = {},
) {
  const { kind = "info", skip = false } = options;
  const previousMessageRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    if (skip || !message) {
      previousMessageRef.current = message;
      return;
    }

    if (previousMessageRef.current !== message) {
      TOAST_HANDLERS[kind](message);
      previousMessageRef.current = message;
    }
  }, [kind, message, skip]);
}
