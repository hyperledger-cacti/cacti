import { createServer } from "http";
import { AddressInfo } from "net";

// import test, { Test } from "tape-promise/tape";
import "jest-extended";

import { Servers } from "../../../main/typescript/index";

const testCase = "Servers";

describe(testCase, () => {
  // test("Servers", async (tParent: Test) => {
  test("Servers#listen()", async () => {
    {
      const server = createServer();
      await expect(
        Servers.listen({
          hostname: "x",
          port: ("" as unknown) as number,
          server,
        }),
      ).toReject();
    }

    {
      const server = createServer();
      await expect(
        Servers.listen({
          hostname: "localhost",
          port: (false as unknown) as number,
          server,
        }),
      ).toReject();
      await Servers.shutdown(server);
    }

    {
      const server = createServer();
      await expect(
        Servers.listen({ hostname: "localhost", port: 0, server }),
      ).toResolve();
      // await t.doesNotReject(
      //   Servers.listen({ hostname: "localhost", port: 0, server }),
      //   "Does not rejects when port specified as zero OK",
      // );
      await Servers.shutdown(server);
    }

    // t.end();
    // });

    const prefPort = 4123;
    const host = "localhost";
    const portBlocker = createServer();
    // test.onFinish(() => portBlocker.close());

    const listenOptionsBlocker = {
      server: portBlocker,
      hostname: host,
      port: prefPort,
    };
    await Servers.listen(listenOptionsBlocker);

    await expect(async () => {
      const server = await Servers.startOnPreferredPort(prefPort, host);
      // test.onFinish(() => server.close());
      // t.ok(server, "Server returned truthy OK");
      expect(server).toBeTruthy();
      const addressInfo = server.address() as AddressInfo;
      // t.ok(addressInfo, "AddressInfo returned truthy OK");
      expect(addressInfo).toBeTruthy();
      // t.ok(addressInfo.port, "AddressInfo.port returned truthy OK");
      expect(addressInfo).toBeTruthy();
      expect(addressInfo.port).not.toBe(prefPort);
      // t.doesNotEqual(
      //   addressInfo.port,
      //   prefPort,
      //   "Preferred and actually allocated ports are different, therefore fallback is considered successful OK",
      // );
    });

    // await t.doesNotReject(async () => {
    //   const server = await Servers.startOnPreferredPort(prefPort, host);
    //   test.onFinish(() => server.close());
    //   t.ok(server, "Server returned truthy OK");
    //   const addressInfo = server.address() as AddressInfo;
    //   t.ok(addressInfo, "AddressInfo returned truthy OK");
    //   t.ok(addressInfo.port, "AddressInfo.port returned truthy OK");
    //   t.doesNotEqual(
    //     addressInfo.port,
    //     prefPort,
    //     "Preferred and actually allocated ports are different, therefore fallback is considered successful OK",
    //   );
    // }, "Servers.startOnPreferredPort falls back without throwing OK");
  });
});
