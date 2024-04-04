import "jest-extended";
import express from "express";

import { configureExpressAppBase } from "../../../../main/typescript/public-api";

describe("configureExpressAppBase()", () => {
  test("Crashes if missing Express instance from ctx", async () => {
    const invocationPromise = configureExpressAppBase({} as never);
    await expect(invocationPromise).toReject();
  });

  test("Does not crash if parameters were valid", async () => {
    const app = express();
    await expect(
      async () => await configureExpressAppBase({ app, logLevel: "DEBUG" }),
    ).not.toThrow();
  });
});
