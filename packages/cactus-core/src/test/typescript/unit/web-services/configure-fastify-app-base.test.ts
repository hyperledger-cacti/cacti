import "jest-extended";
import fastify from "fastify";

import { configureFastifyAppBase } from "../../../../main/typescript/public-api";

describe("configureFastifyAppBase()", () => {
  let app: ReturnType<typeof fastify>;

  beforeAll(() => {
    app = fastify();
  });

  test("Crashes if missing Fastify instance from ctx", async () => {
    const invocationPromise = configureFastifyAppBase({} as never);
    await expect(invocationPromise).toReject();
  });

  test("Does not crash if parameters were valid", async () => {
    await expect(
      async () => await configureFastifyAppBase({ app, logLevel: "DEBUG" }),
    ).not.toThrow();
  });
});
