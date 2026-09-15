import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ProductionOSError, TOOL_VERSION, STATE_SCHEMA_VERSION, productionOSPaths, type ProjectState } from "../../../packages/core/src/index.js";

export function initialState(root: string): ProjectState {
  return {
    schemaVersion: STATE_SCHEMA_VERSION,
    toolVersion: TOOL_VERSION,
    root,
    currentMilestone: "foundation",
    lastCommand: null,
    updatedAt: new Date().toISOString(),
    artifacts: ["manifest.yaml", "state.json"],
    summary: {
      framework: null,
      capabilities: [],
      unresolvedControls: 0,
      failedControls: 0,
      staleEvidence: 0
    },
    blockers: ["Repository has not been inspected yet."],
    nextActions: ["Run prodos inspect, then prodos audit."]
  };
}

export async function ensureStateDirectories(root: string): Promise<void> {
  const paths = productionOSPaths(root);
  await Promise.all([
    mkdir(paths.directory, { recursive: true }),
    mkdir(paths.evidence, { recursive: true }),
    mkdir(paths.waivers, { recursive: true }),
    mkdir(paths.reports, { recursive: true }),
    mkdir(paths.remediations, { recursive: true })
  ]);
}

export async function loadState(root: string): Promise<ProjectState> {
  const path = productionOSPaths(root).state;
  try {
    const state = JSON.parse(await readFile(path, "utf8")) as ProjectState;
    if (state.schemaVersion !== STATE_SCHEMA_VERSION) throw new ProductionOSError("STATE_VERSION", `Unsupported state schema in ${path}.`);
    return state;
  } catch (error) {
    if (error instanceof ProductionOSError) throw error;
    throw new ProductionOSError("STATE_MISSING", `State not found at ${path}. Run 'prodos init' first.`);
  }
}

export async function saveState(root: string, state: ProjectState): Promise<void> {
  const path = productionOSPaths(root).state;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function updateState(root: string, update: Partial<ProjectState>): Promise<ProjectState> {
  const current = await loadState(root);
  const next: ProjectState = { ...current, ...update, updatedAt: new Date().toISOString() };
  await saveState(root, next);
  return next;
}

export async function initializeState(root: string): Promise<ProjectState> {
  await ensureStateDirectories(root);
  const state = initialState(root);
  await saveState(root, state);
  return state;
}
