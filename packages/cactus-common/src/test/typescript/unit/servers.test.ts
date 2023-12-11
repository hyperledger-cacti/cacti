import { createServer } from "http";
import { AddressInfo } from "net";
import "jest-extended";

import { Servers } from "../../../main/typescript/index";

const testCase = "Servers";

describe(testCase, () => {
  const server = createServer();
  const portBlocker = createServer();

  afterAll(async () => {
    await Servers.shutdown(server);
    await portBlocker.close();
  });

  test("Servers#listen()", async () => {
    {
      await expect(
        Servers.listen({
          hostname: "x",
          port: "" as unknown as number,
          server,
        }),
      ).toReject();
    }

    {
      await expect(
        Servers.listen({
          hostname: "127.0.0.1",
          port: false as unknown as number,
          server,
        }),
      ).toReject();
    }

    {
      await expect(
        Servers.listen({ hostname: "127.0.0.1", port: 0, server }),
      ).toResolve();
    }

    const prefPort = 4123;
    const host = "127.0.0.1";

    const listenOptionsBlocker = {
      server: portBlocker,
      hostname: host,
      port: prefPort,
    };
    await Servers.listen(listenOptionsBlocker);

    await expect(async () => {
      const server = await Servers.startOnPreferredPort(prefPort, host);
      expect(server).toBeTruthy();
      const addressInfo = server.address() as AddressInfo;
      expect(addressInfo).toBeTruthy();
      expect(addressInfo).toBeTruthy();
      expect(addressInfo.port).not.toBe(prefPort);
    });
  });
});
