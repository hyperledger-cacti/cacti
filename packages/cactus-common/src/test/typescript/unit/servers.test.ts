import { createServer } from "http";
import { AddressInfo } from "net";

import test, { Test } from "tape-promise/tape";

import { Servers } from "../../../main/typescript/index";

test("Servers", async (tParent: Test) => {
  test("Servers#listen()", async (t: Test) => {
    {
      const server = createServer();
      await t.rejects(
        Servers.listen({
          hostname: "x",
          port: ("" as unknown) as number,
          server,
        }),
        /options\.port/,
        "Rejects when port specified as empty string OK",
      );
    }

    {
      const server = createServer();
      await t.rejects(
        Servers.listen({
          hostname: "localhost",
          port: (false as unknown) as number,
          server,
        }),
        /options\.port/,
        "Rejects when port specified as literal false boolean OK",
      );
      // await Servers.shutdown(server);
    }

    {
      const server = createServer();
      await t.doesNotReject(
        Servers.listen({ hostname: "localhost", port: 0, server }),
        "Does not rejects when port specified as zero OK",
      );
      await Servers.shutdown(server);
    }

    t.end();
  });

  test("Servers#startOnPreferredPort()", async (t: Test) => {
    const prefPort = 4123;
    const host = "0.0.0.0";
    const portBlocker = createServer();
    test.onFinish(() => portBlocker.close());
    const listenOptionsBlocker = {
      server: portBlocker,
      hostname: host,
      port: prefPort,
    };
    await Servers.listen(listenOptionsBlocker);

    await t.doesNotReject(async () => {
      const server = await Servers.startOnPreferredPort(prefPort, host);
      test.onFinish(() => server.close());
      t.ok(server, "Server returned truthy OK");
      const addressInfo = server.address() as AddressInfo;
      t.ok(addressInfo, "AddressInfo returned truthy OK");
      t.ok(addressInfo.port, "AddressInfo.port returned truthy OK");
      t.doesNotEqual(
        addressInfo.port,
        prefPort,
        "Preferred and actually allocated ports are different, therefore fallback is considered successful OK",
      );
    }, "Servers.startOnPreferredPort falls back without throwing OK");

    t.end();
  });

  tParent.end();
});
