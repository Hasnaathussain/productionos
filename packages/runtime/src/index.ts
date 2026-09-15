export const LOAD_SCHEMA_VERSION = 1 as const;

export interface LocalLoadOptions {
  url: string;
  requests: number;
  concurrency: number;
  method: string;
  timeoutMs: number;
  allowLocal: boolean;
  body?: string;
}

export interface LoadReport {
  schemaVersion: typeof LOAD_SCHEMA_VERSION;
  url: string;
  method: string;
  requests: number;
  concurrency: number;
  timeoutMs: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  successes: number;
  failures: number;
  errorRate: number;
  throughputPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  statusCounts: Record<string, number>;
  classification: "measured";
  saturation: "unknown";
  errors: string[];
  limitations: string[];
}

interface Sample {
  latencyMs: number;
  status: number | null;
  ok: boolean;
  error?: string;
}

function assertOptions(options: LocalLoadOptions): URL {
  if (!options.allowLocal) throw new Error("Local load requires explicit allowLocal authorization.");
  if (!Number.isInteger(options.requests) || options.requests < 1 || options.requests > 1000) throw new Error("requests must be an integer between 1 and 1000.");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 50) throw new Error("concurrency must be an integer between 1 and 50.");
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 50 || options.timeoutMs > 10000) throw new Error("timeoutMs must be an integer between 50 and 10000.");
  const parsed = new URL(options.url);
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const loopback = hostname === "localhost" || hostname === "::1" || hostname === "127.0.0.1" || hostname.startsWith("127.");
  if (!loopback || !["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Only credential-free HTTP(S) loopback URLs are allowed.");
  return parsed;
}

function percentile(values: number[], percentage: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentage) - 1));
  return Math.round((sorted[index] ?? 0) * 100) / 100;
}

async function request(url: string, options: LocalLoadOptions): Promise<Sample> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const init: { method: string; signal: AbortSignal; redirect: "error"; body?: string; headers?: Record<string, string> } = { method: options.method.toUpperCase(), signal: controller.signal, redirect: "error" };
    if (options.body !== undefined) {
      init.body = options.body;
      init.headers = { "content-type": "application/json" };
    }
    const response = await fetch(url, init);
    await response.body?.cancel();
    return { latencyMs: Date.now() - started, status: response.status, ok: response.ok };
  } catch (error) {
    return { latencyMs: Date.now() - started, status: null, ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function runLocalLoad(options: LocalLoadOptions): Promise<LoadReport> {
  const parsed = assertOptions(options);
  const startedAt = new Date().toISOString();
  const wallStart = Date.now();
  const samples: Sample[] = [];
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= options.requests) return;
      samples[index] = await request(parsed.toString(), options);
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.concurrency, options.requests) }, () => worker()));
  const durationMs = Math.max(1, Date.now() - wallStart);
  const completed = samples.filter((sample): sample is Sample => sample !== undefined);
  const successes = completed.filter((sample) => sample.ok).length;
  const failures = completed.length - successes;
  const latencies = completed.map((sample) => sample.latencyMs);
  const statusCounts: Record<string, number> = {};
  for (const sample of completed) {
    const key = sample.status === null ? "network_error" : String(sample.status);
    statusCounts[key] = (statusCounts[key] ?? 0) + 1;
  }
  return {
    schemaVersion: LOAD_SCHEMA_VERSION,
    url: parsed.toString(),
    method: options.method.toUpperCase(),
    requests: options.requests,
    concurrency: Math.min(options.concurrency, options.requests),
    timeoutMs: options.timeoutMs,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs,
    successes,
    failures,
    errorRate: Number((failures / options.requests).toFixed(4)),
    throughputPerSecond: Number((completed.length / (durationMs / 1000)).toFixed(2)),
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    p99Ms: percentile(latencies, 0.99),
    statusCounts,
    classification: "measured",
    saturation: "unknown",
    errors: [...new Set(completed.map((sample) => sample.error).filter((error): error is string => Boolean(error)))].slice(0, 10),
    limitations: ["This measures an explicitly authorized loopback endpoint only.", "Saturation, production capacity, and downstream dependency behavior are unknown."]
  };
}
