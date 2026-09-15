# ADR-0023: Release the project under Apache-2.0

## Status

Accepted

## Context

ProductionOS is intended for public use by individual developers, teams, and commercial adopters. The first release needs a permissive open-source license that is explicit about patent rights and does not impose a reciprocal obligation on downstream applications.

## Decision

Release the repository under Apache-2.0. The root `LICENSE` file is the authoritative license text, and the package metadata declares the same license.

## Consequences

- Users may use, modify, and redistribute the project subject to Apache-2.0 terms.
- The license includes an express patent grant and a patent-litigation termination condition.
- Contributors must preserve the license and required notices when redistributing covered work.
- This decision does not grant rights to use project trademarks or imply compliance certification.
