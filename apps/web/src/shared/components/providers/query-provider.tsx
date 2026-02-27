"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import { routes } from "@/shared/constants/routes";

type Props = {
  children: React.ReactNode;
};

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const maybeStatus = (error as { status?: unknown }).status;
  return typeof maybeStatus === "number" ? maybeStatus : null;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = getErrorStatus(error);
          if (status === 401 || status === 403) return false;

          if (process.env.NODE_ENV !== "production") return false;
          return failureCount < 3;
        },
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
        staleTime: 10 * 1000,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        const status = getErrorStatus(error);
        if (status === null) return;

        if (status === 401 && typeof window !== "undefined") {
          toast.error("Session expired.");
          const redirect = encodeURIComponent(window.location.href);
          window.location.assign(`${routes.auth.login}?redirect=${redirect}`);
          return;
        }

        if (status === 500) {
          toast.error("Internal server error.");
        }
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: Props) {
  const queryClient = getQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
