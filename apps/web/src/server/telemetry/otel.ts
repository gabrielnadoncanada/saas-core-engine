import { performance } from "node:perf_hooks";

import {
  context,
  metrics,
  propagation,
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Counter,
  type Histogram as OTelHistogram,
} from "@opentelemetry/api";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

import { env } from "@/server/config/env";

let initialized = false;
let requestCounter: Counter | null = null;
let requestLatencyMs: OTelHistogram | null = null;

function trimSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function ensureTelemetryInitialized(): void {
  if (initialized) return;
  initialized = true;

  if (!env.OTEL_ENABLED || !env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  const baseUrl = trimSlash(env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const resource = resourceFromAttributes({
    "service.name": env.APP_NAME,
    "service.namespace": "saas-core-engine",
    "deployment.environment": env.NODE_ENV,
  });

  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: `${baseUrl}/v1/traces`,
        }),
      ),
    ],
  });
  tracerProvider.register();

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: `${baseUrl}/v1/metrics`,
        }),
        exportIntervalMillis: env.OTEL_EXPORT_INTERVAL_MS,
      }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);
}

function ensureInstruments(): { counter: Counter; latency: OTelHistogram } {
  ensureTelemetryInitialized();

  if (requestCounter && requestLatencyMs) {
    return { counter: requestCounter, latency: requestLatencyMs };
  }

  const meter = metrics.getMeter("web-api");
  requestCounter = meter.createCounter("http_server_requests_total", {
    description: "Total number of HTTP requests served by API routes",
  });
  requestLatencyMs = meter.createHistogram("http_server_duration_ms", {
    description: "HTTP request duration in milliseconds",
    unit: "ms",
  });
  return { counter: requestCounter, latency: requestLatencyMs };
}

export function getActiveTraceContext():
  | { traceId: string; spanId: string }
  | null {
  const span = trace.getActiveSpan();
  if (!span) return null;
  const spanCtx = span.spanContext();
  return { traceId: spanCtx.traceId, spanId: spanCtx.spanId };
}

export async function withApiTelemetry<T extends Response>(
  req: Request,
  route: string,
  handler: () => Promise<T>,
  attributes: Attributes = {},
): Promise<T> {
  const { counter, latency } = ensureInstruments();
  const tracer = trace.getTracer("web-api");
  const carrier = {
    traceparent: req.headers.get("traceparent") ?? undefined,
    tracestate: req.headers.get("tracestate") ?? undefined,
  };
  const extracted = propagation.extract(ROOT_CONTEXT, carrier);
  const startedAt = performance.now();

  const span = tracer.startSpan(
    `${req.method} ${route}`,
    {
      kind: SpanKind.SERVER,
      attributes: {
        "http.method": req.method,
        "http.route": route,
        ...attributes,
      },
    },
    extracted,
  );

  try {
    return await context.with(trace.setSpan(extracted, span), async () => {
      const response = await handler();
      const duration = performance.now() - startedAt;
      const attrs = {
        "http.method": req.method,
        "http.route": route,
        "http.status_code": response.status,
      };

      span.setAttribute("http.status_code", response.status);
      span.setStatus({
        code: response.status >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      });
      counter.add(1, attrs);
      latency.record(duration, attrs);

      const ctx = span.spanContext();
      response.headers.set("x-trace-id", ctx.traceId);
      response.headers.set("x-span-id", ctx.spanId);
      return response;
    });
  } catch (error) {
    const duration = performance.now() - startedAt;
    const attrs = {
      "http.method": req.method,
      "http.route": route,
      "http.status_code": 500,
    };
    counter.add(1, attrs);
    latency.record(duration, attrs);
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR });
    throw error;
  } finally {
    span.end();
  }
}
