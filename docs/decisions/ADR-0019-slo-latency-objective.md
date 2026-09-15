# ADR-0019: Generate latency objectives without inventing latency targets

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The SLO contract includes p95 latency for public APIs, but latency targets depend on endpoint class, payload shape, and user-visible budget. A generic number would look precise without being justified.

## Decision

When a public API capability is detected, `prodos slo` emits an `api-latency-p95` objective with `unit: milliseconds`, `target: null`, and `UNSPECIFIED` status. It becomes useful only when a user or future authorized adapter supplies a target and measurement context.

## Verification

Operations tests assert that public SaaS output includes the latency objective and does not invent a target.
