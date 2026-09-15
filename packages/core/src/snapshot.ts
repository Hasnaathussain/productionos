import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { sha256 } from "./hash.js";
import type { RepositorySnapshot, SnapshotFile } from "./contracts.js";

const IGNORED_DIRECTORIES = new Set([".git", ".next", ".productionos", "node_modules", "dist", "build", "coverage", ".turbo"]);
const MAX_FILES = 800;
const MAX_BYTES_PER_FILE = 512 * 1024;
const TEXT_FILE = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|yaml|yml|toml|md|sql|prisma|env|config)$/i;

async function walk(root: string, current: string, files: string[]): Promise<void> {
  if (files.length >= MAX_FILES) return;
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (files.length >= MAX_FILES) return;
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) await walk(root, path, files);
    } else if (entry.isFile() && TEXT_FILE.test(entry.name)) {
      files.push(relative(root, path).replaceAll("\\", "/"));
    }
  }
}

export async function loadRepositorySnapshot(root: string): Promise<RepositorySnapshot> {
  const paths: string[] = [];
  await walk(root, root, paths);
  const files: SnapshotFile[] = [];
  let truncated = paths.length >= MAX_FILES;
  for (const path of paths) {
    const absolute = join(root, path);
    const buffer = await readFile(absolute);
    if (buffer.byteLength > MAX_BYTES_PER_FILE) {
      truncated = true;
      continue;
    }
    const content = buffer.toString("utf8");
    files.push({ path, content, hash: sha256(buffer) });
  }
  const fingerprint = sha256(files.map((file) => `${file.path}:${file.hash}`).join("\n"));
  return { root, files, fingerprint, truncated };
}
