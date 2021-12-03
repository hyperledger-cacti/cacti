import "jest-extended";

import { Objects } from "../../../../main/typescript/public-api";
import { A } from "../../fixtures/dummy-classes";

test("handles inheritance correctly", async () => {
  const a = new A();
  const methodNames = Objects.getAllMethodNames(a);
  expect(Array.isArray(methodNames)).toBeTruthy();
  expect(methodNames.length).toBe(2);
  expect(methodNames.includes("getX")).toBeTruthy();
  expect(methodNames.includes("getA")).toBeTruthy();
});
