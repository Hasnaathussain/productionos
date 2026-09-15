import { join, resolve } from "node:path";

export interface ProductionOSPaths {
  root: string;
  directory: string;
  manifest: string;
  discovery: string;
  capabilities: string;
  requirements: string;
  state: string;
  evidence: string;
  waivers: string;
  reports: string;
  remediations: string;
}

export function productionOSPaths(root: string): ProductionOSPaths {
  const resolvedRoot = resolve(root);
  const directory = join(resolvedRoot, ".productionos");
  return {
    root: resolvedRoot,
    directory,
    manifest: join(directory, "manifest.yaml"),
    discovery: join(directory, "discovery.json"),
    capabilities: join(directory, "capabilities.json"),
    requirements: join(directory, "requirements.json"),
    state: join(directory, "state.json"),
    evidence: join(directory, "evidence"),
    waivers: join(directory, "waivers"),
    reports: join(directory, "reports"),
    remediations: join(directory, "remediations")
  };
}
