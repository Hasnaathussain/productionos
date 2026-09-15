# Security policy

ProductionOS executes inside repositories and is therefore supply-chain-sensitive.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Until a project security contact is published, create a private report through the repository host or contact the project maintainer directly with:

- affected version and commit;
- minimal reproduction;
- impact and required permissions;
- suggested mitigation, if known.

Do not include real secrets or private source code in a report.

## Security properties

ProductionOS is local-first, does not upload source by default, avoids executing target code during discovery, uses explicit subprocess boundaries, and records verification limitations. These are design goals, not a certification or guarantee.
