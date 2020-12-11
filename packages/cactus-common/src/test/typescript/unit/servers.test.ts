import { createServer } from "http";

import test, { Test } from "tape-promise/tape";

import { Servers } from "../../../main/typescript/index";

test("Servers", async (tParent: Test) => {
  test("Servers#listen()", async (t: Test) => {
    {
      const server = createServer();
      await t.rejects(
        Servers.listen({ hostname: "x", port: "" as any, server }),
        /options\.port/,
        "Rejects when port specified as empty string OK"
      );
    }

    {
      const server = createServer();
      await t.rejects(
        Servers.listen({ hostname: "localhost", port: false as any, server }),
        /options\.port/,
        "Rejects when port specified as literal false boolean OK"
      );
      // await Servers.shutdown(server);
    }

    {
      const server = createServer();
      await t.doesNotReject(
        Servers.listen({ hostname: "localhost", port: 0, server }),
        "Does not rejects when port specified as zero OK"
      );
      await Servers.shutdown(server);
    }

    t.end();
  });

  tParent.end();
});
