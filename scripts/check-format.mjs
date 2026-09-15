import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !["node_modules", "dist", ".git"].includes(entry.name)) files.push(...await collect(path));
    else if (entry.isFile() && /\.(ts|json|md)$/.test(entry.name)) files.push(path);
  }
  return files;
}

const files = [];
for (const root of ["apps", "packages", "scripts"]) files.push(...await collect(root));
const failures = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  if (content.includes("\r\n")) failures.push(`${file}: CRLF line endings`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Checked ${files.length} text files.`);
