# ADR-0010: Load measurement is explicitly authorized and loopback-only in v0.1

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The specification requires capacity measurements such as latency percentiles, throughput, and error rate, but ProductionOS must not probe arbitrary production or third-party systems. A first release also cannot honestly infer saturation or production capacity from source inspection.

## Decision

Implement `prodos load` as a bounded local runtime measurement. The caller must supply `--url` and `--allow-local`; the runtime accepts only credential-free HTTP(S) loopback URLs, caps requests/concurrency/timeouts, and records measured p50/p95/p99 latency, throughput, status counts, and error rate. Saturation and production capacity are explicitly reported as unknown. The report is stored under `.productionos/reports/load.json` and is not silently promoted to control evidence.

## Alternatives considered

- Arbitrary URL probing: violates the trust and safety boundary.
- Source-based capacity estimates: would fabricate measurements.
- Adding k6 as a mandatory dependency: unnecessary for the bounded local contract and increases installation complexity.

## Verification

The runtime package tests a local HTTP server and rejects unauthorized/non-loopback targets. CLI output and persistence are covered by the existing build and command path.
