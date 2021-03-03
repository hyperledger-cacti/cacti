import test, { Test } from "tape-promise/tape";
import { CordaTestLedger } from "../../../../../main/typescript/public-api";

test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(CordaTestLedger);
  assert.throws(() => new CordaTestLedger({ imageVersion: "nope" }));
  assert.end();
});

test("constructor does not throw if valid input is provided", (t: Test) => {
  t.ok(CordaTestLedger);
  t.doesNotThrow(() => new CordaTestLedger());
  t.end();
});

test("starts/stops/destroys a docker container", async (t: Test) => {
  const cordaTestLedger = new CordaTestLedger();
  t.ok(cordaTestLedger, "CordaTestLedger instantiated OK.");
  t.end();
});
