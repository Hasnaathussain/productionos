import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EVIDENCE_SCHEMA_VERSION, sha256, productionOSPaths, type EvidenceRecord, type RepositorySnapshot } from "../../../packages/core/src/index.js";

function matchesHint(path: string, hint: string): boolean {
  const normalized = hint.replaceAll("\\", "/").replace(/^\.\//, "");
  return path === normalized || path.startsWith(`${normalized}/`) || normalized.endsWith("/") && path.startsWith(normalized) || path.endsWith(`/${normalized}`);
}

export function filesForHints(snapshot: RepositorySnapshot, hints: string[]): string[] {
  const paths = snapshot.files.filter((file) => hints.some((hint) => matchesHint(file.path, hint))).map((file) => file.path);
  return [...new Set(paths)].sort();
}

export function fingerprintForFiles(snapshot: RepositorySnapshot, files: string[]): string {
  const selected = snapshot.files.filter((file) => files.includes(file.path)).sort((left, right) => left.path.localeCompare(right.path));
  return sha256(selected.map((file) => `${file.path}:${file.hash}`).join("\n"));
}

export function evidenceIsFresh(record: EvidenceRecord, snapshot: RepositorySnapshot, expectedControlVersion?: string): boolean {
  if (expectedControlVersion !== undefined && record.controlVersion !== expectedControlVersion) return false;
  return record.inputFingerprint === fingerprintForFiles(snapshot, filesForHints(snapshot, record.affectedFiles));
}

function evidencePath(root: string, evidenceId: string): string {
  const safe = evidenceId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return join(productionOSPaths(root).evidence, `${safe}.json`);
}

export async function writeEvidence(root: string, record: EvidenceRecord): Promise<void> {
  const path = evidencePath(root, record.evidenceId);
  await mkdir(productionOSPaths(root).evidence, { recursive: true });
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

export async function readEvidence(root: string, evidenceId: string): Promise<EvidenceRecord | null> {
  try {
    const record = JSON.parse(await readFile(evidencePath(root, evidenceId), "utf8")) as EvidenceRecord;
    return record.schemaVersion === EVIDENCE_SCHEMA_VERSION ? record : null;
  } catch {
    return null;
  }
}

export async function listEvidence(root: string): Promise<EvidenceRecord[]> {
  const directory = productionOSPaths(root).evidence;
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { return []; }
  const records: EvidenceRecord[] = [];
  for (const entry of entries.filter((entry) => entry.isFile() && entry.name.endsWith(".json")).sort((left, right) => left.name.localeCompare(right.name))) {
    try {
      const record = JSON.parse(await readFile(join(directory, entry.name), "utf8")) as EvidenceRecord;
      if (record.schemaVersion === EVIDENCE_SCHEMA_VERSION) records.push(record);
    } catch {
      // Invalid evidence is ignored by the loader and surfaced by the next verification run.
    }
  }
  return records;
}

export function evidenceIdForControl(controlId: string, method: string): string {
  return `${controlId.toLowerCase()}-${method}`;
}
