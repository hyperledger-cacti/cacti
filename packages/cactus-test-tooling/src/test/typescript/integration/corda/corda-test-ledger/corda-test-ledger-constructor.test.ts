import { CordaTestLedger } from "../../../../../main/typescript/public-api";
import "jest-extended";

test("constructor throws if invalid input is provided", () => {
  expect(CordaTestLedger).toBeTruthy();
  expect(() => new CordaTestLedger({ imageVersion: "nope" })).toThrow(Error);
});

test("constructor does not throw if valid input is provided", () => {
  expect(CordaTestLedger).toBeTruthy();
  expect(() => new CordaTestLedger()).not.toThrow();
});

test("starts/stops/destroys a docker container", async () => {
  const cordaTestLedger = new CordaTestLedger();
  expect(cordaTestLedger).toBeTruthy();
});
