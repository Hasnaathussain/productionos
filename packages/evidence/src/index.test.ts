import test from "node:test";
import assert from "node:assert/strict";
import { loadRepositorySnapshot } from "../../../packages/core/src/index.js";
import { evidenceIsFresh, fingerprintForFiles, filesForHints } from "./index.js";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("evidence fingerprints are targeted to affected files", async () => {
  const root = await mkdtemp(join(tmpdir(), "productionos-evidence-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "checkout.ts"), "export const checkout = true;", "utf8");
  await writeFile(join(root, "src", "unrelated.ts"), "export const unrelated = true;", "utf8");
  const first = await loadRepositorySnapshot(root);
  const affected = filesForHints(first, ["src/checkout.ts"]);
  const firstFingerprint = fingerprintForFiles(first, affected);
  await writeFile(join(root, "src", "unrelated.ts"), "export const unrelated = false;", "utf8");
  const second = await loadRepositorySnapshot(root);
  assert.deepEqual(filesForHints(second, ["src/checkout.ts"]), affected);
  assert.equal(fingerprintForFiles(second, affected), firstFingerprint);
  await writeFile(join(root, "src", "checkout.ts"), "export const checkout = false;", "utf8");
  const third = await loadRepositorySnapshot(root);
  assert.notEqual(fingerprintForFiles(third, affected), firstFingerprint);
});

test("directory hints invalidate evidence when a relevant file changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "productionos-evidence-hints-"));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "route.ts"), "export const route = true;", "utf8");
  await writeFile(join(root, "docs.md"), "unrelated", "utf8");
  const first = await loadRepositorySnapshot(root);
  const hints = ["src"];
  const record = { inputFingerprint: fingerprintForFiles(first, filesForHints(first, hints)), affectedFiles: hints } as Parameters<typeof evidenceIsFresh>[0];
  assert.equal(evidenceIsFresh(record, first), true);
  assert.equal(evidenceIsFresh({ ...record, controlVersion: "1.0.0" } as Parameters<typeof evidenceIsFresh>[0], first, "0.9.0"), false);
  await writeFile(join(root, "docs.md"), "unrelated change", "utf8");
  const unrelated = await loadRepositorySnapshot(root);
  assert.equal(evidenceIsFresh(record, unrelated), true);
  await writeFile(join(root, "src", "new.ts"), "export const changed = true;", "utf8");
  const relevant = await loadRepositorySnapshot(root);
  assert.equal(evidenceIsFresh(record, relevant), false);
});
