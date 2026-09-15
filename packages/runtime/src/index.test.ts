import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { runLocalLoad } from "./index.js";

test("local load reports measured latency and status metrics", async () => {
  const server = createServer((_request, response) => {
    response.statusCode = 200;
    response.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const report = await runLocalLoad({ url: `http://127.0.0.1:${address.port}/health`, requests: 12, concurrency: 3, method: "GET", timeoutMs: 1000, allowLocal: true });
    assert.equal(report.schemaVersion, 1);
    assert.equal(report.successes, 12);
    assert.equal(report.failures, 0);
    assert.equal(report.statusCounts["200"], 12);
    assert.equal(report.classification, "measured");
    assert.equal(report.saturation, "unknown");
    assert.ok(report.p95Ms >= report.p50Ms);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("local load refuses unauthorized or non-loopback targets", async () => {
  await assert.rejects(() => runLocalLoad({ url: "https://example.com", requests: 1, concurrency: 1, method: "GET", timeoutMs: 1000, allowLocal: false }));
  await assert.rejects(() => runLocalLoad({ url: "https://example.com", requests: 1, concurrency: 1, method: "GET", timeoutMs: 1000, allowLocal: true }));
});

test("local load does not follow redirects outside the authorized endpoint", async () => {
  const server = createServer((_request, response) => {
    response.statusCode = 302;
    response.setHeader("location", "https://example.com");
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const report = await runLocalLoad({ url: `http://127.0.0.1:${address.port}/redirect`, requests: 1, concurrency: 1, method: "GET", timeoutMs: 1000, allowLocal: true });
    assert.equal(report.failures, 1);
    assert.equal(report.statusCounts.network_error, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
