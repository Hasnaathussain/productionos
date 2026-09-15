import test from "node:test";
import assert from "node:assert/strict";

test("fixture keeps secret values outside source", () => {
  assert.equal(Boolean(process.env.NOT_A_SECRET_VALUE), false);
});
