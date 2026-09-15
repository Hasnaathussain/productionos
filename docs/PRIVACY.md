# Privacy

ProductionOS is local-first. The core CLI reads the target repository from disk and does not upload source or send telemetry. Running an optional external adapter or a target test command may create its own network activity; that behavior must be explicit and attributable in evidence.

Future cloud features must disclose transmitted data, minimize source material, support opt-out, and never silently upload repositories.

The local load command is different from source analysis: it sends explicitly requested requests to a loopback endpoint supplied by the user. It rejects arbitrary hosts and records the measured URL and limitations in `.productionos/reports/load.json`.
