# ADR-0015: Infer only missing manifest fields from deterministic repository facts

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

The manifest should require as little manual duplication as possible, but a repository scan must not silently replace a user's explicit deployment or provider choice. The discovery contract already has bounded package and configuration facts that can identify a small set of initial adapters.

## Decision

Discovery emits a bounded deployment value for recognizable local configuration (`vercel`, `cloudflare`, `render`, `fly`, `netlify`, or `docker`). Manifest inspection fills missing framework, deployment, database, authentication, payment, AI, and upload provider fields from deterministic dependency/configuration facts. Existing explicit values are preserved. Unknown providers remain unspecified.

## Verification

Discovery tests cover Vercel detection. Manifest tests cover provider inference from the SaaS fixture and preservation of explicit configured values.
