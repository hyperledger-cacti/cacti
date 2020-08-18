import test, { Test } from "tape";

import { Objects } from "../../../../main/typescript/public-api";
import { A } from "../../fixtures/dummy-classes";

test("handles inheritance correctly", async (assert: Test) => {
  const a = new A();
  const methodNames = Objects.getAllMethodNames(a);
  assert.ok(Array.isArray(methodNames), "expect an arran of strings returned");
  assert.ok(methodNames.length === 2, "method count equals 2");
  assert.ok(methodNames.includes("getX"), '"getX" method present');
  assert.ok(methodNames.includes("getA"), '"getA" method present');
  assert.end();
});
