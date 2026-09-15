# ADR-0013: SLO objectives are configuration and planning, not evidence

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Higher-maturity applications need explicit objectives for availability and critical business paths, but a configured target is not a measurement. The master specification also prohibits inventing unrealistic targets.

## Decision

`prodos slo` emits capability-triggered objectives. It preserves a manifest-configured availability target, labels it `CONFIGURED_UNVERIFIED`, leaves authentication/payment/job objectives unspecified unless a future runtime adapter supplies measurements, and stores the report under `.productionos/reports/slo.json`. SLO reports never promote control evidence or imply achieved availability.

## Verification

Operations package tests cover configured availability, unverified status, capability-triggered checkout objectives, and the no-capability prototype case. The CLI integration test confirms durable command output.
