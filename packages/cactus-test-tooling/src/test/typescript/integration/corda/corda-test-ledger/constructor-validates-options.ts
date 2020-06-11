const tap = require("tap");
import {
  CordaTestLedger,
  IKeyPair,
  isIKeyPair,
} from "../../../../../main/typescript/public-api";
import { Container } from "dockerode";

tap.test("constructor throws if invalid input is provided", (assert: any) => {
  assert.ok(CordaTestLedger);
  assert.throws(() => new CordaTestLedger({ containerImageVersion: "nope" }));
  assert.end();
});
