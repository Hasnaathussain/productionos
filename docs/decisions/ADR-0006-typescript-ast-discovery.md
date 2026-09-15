# ADR-0006: Use the TypeScript compiler API for structured discovery facts

- **Status:** Accepted
- **Date:** 2026-09-14

## Context

Repository discovery needs more than string presence. Import boundaries, exported handlers, and call sites are structured facts, while regex-only matching is prone to matching comments, unrelated identifiers, and serialized data.

## Decision

Use the TypeScript compiler API to parse `.ts` and `.tsx` files without executing target code. Persist a bounded AST fact summary beside regex/path signals. Regex remains useful for configuration and domain-specific textual patterns, but structured discovery can progressively consume imports, exports, and calls.

## Consequences

- The TypeScript compiler is a justified runtime dependency for the initial TypeScript-focused CLI.
- Parsing is syntax-only and must not be described as type- or data-flow analysis.
- Malformed files are tolerated by the parser and remain visible through bounded discovery results.
- Future adapters can provide equivalent normalized facts for other languages.
