import test from "node:test";
import assert from "node:assert/strict";

test("fixture test command is deterministic", () => {
  assert.equal(2 + 2, 4);
});
