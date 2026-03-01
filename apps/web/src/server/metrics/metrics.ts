import "server-only";

type CounterName =
  | "auth_rate_limited_total"
  | "billing_webhook_processed_total"
  | "billing_webhook_failed_total"
  | "billing_webhook_ignored_total"
  | "billing_webhook_duplicate_total"
  | "billing_reconcile_manual_total"
  | "billing_reconcile_failure_total"
  | "ready_ok_total"
  | "ready_not_ready_total";

type MetricsStore = {
  counters: Record<CounterName, number>;
};

declare global {
  // eslint-disable-next-line no-var
  var __saasCoreMetricsStore: MetricsStore | undefined;
}

const initialCounters: Record<CounterName, number> = {
  auth_rate_limited_total: 0,
  billing_webhook_processed_total: 0,
  billing_webhook_failed_total: 0,
  billing_webhook_ignored_total: 0,
  billing_webhook_duplicate_total: 0,
  billing_reconcile_manual_total: 0,
  billing_reconcile_failure_total: 0,
  ready_ok_total: 0,
  ready_not_ready_total: 0,
};

function getStore(): MetricsStore {
  if (!globalThis.__saasCoreMetricsStore) {
    globalThis.__saasCoreMetricsStore = { counters: { ...initialCounters } };
  }
  return globalThis.__saasCoreMetricsStore;
}

export function incrementMetric(name: CounterName, by = 1): void {
  const store = getStore();
  store.counters[name] += by;
}

export function getMetricsSnapshot(): Record<CounterName, number> {
  return { ...getStore().counters };
}

