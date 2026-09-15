# Writing adapters

Adapters translate framework/provider-specific repository facts into normalized discovery or verification contracts. Do not let an adapter leak provider assumptions into the core graph.

Adapters must be deterministic where possible, bounded in file and process scope, explicit about unavailable tools, and covered by fixtures. External scanners are optional and must document network, telemetry, permissions, and output provenance.
