import test from "node:test";
import assert from "node:assert/strict";
import { discoverRepository } from "../../../packages/discovery/src/index.js";
import { buildCapabilityGraph } from "./index.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fixture = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../fixtures/nextjs-saas");

test("capability graph adds payment dependencies", async () => {
  const graph = buildCapabilityGraph(await discoverRepository(fixture));
  const ids = new Set(graph.nodes.map((node) => node.id));
  assert.ok(ids.has("payments"));
  assert.ok(ids.has("webhooks"));
  assert.ok(graph.edges.some((edge) => edge.from === "payments" && edge.to === "webhooks"));

  const discovered = await discoverRepository(fixture);
  const operationalGraph = buildCapabilityGraph({
    ...discovered,
    signals: {
      ...discovered.signals,
      background_jobs: { files: ["workers/send.ts"], matches: 1 },
      email_delivery: { files: ["email/client.ts"], matches: 1 }
    }
  });
  assert.ok(operationalGraph.nodes.some((node) => node.id === "background_jobs" && node.evidence.includes("workers/send.ts")));
  assert.ok(operationalGraph.nodes.some((node) => node.id === "email_delivery" && node.evidence.includes("email/client.ts")));
});
