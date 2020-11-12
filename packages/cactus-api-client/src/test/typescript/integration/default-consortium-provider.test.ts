import { AddressInfo } from "net";

import test, { Test } from "tape";

// import { ApiClient } from "../../../main/typescript/public-api";
import { DefaultApi as ConsortiumApi } from "@hyperledger/cactus-plugin-consortium-manual";
import { LogLevelDesc, Servers } from "@hyperledger/cactus-common";
import { DefaultConsortiumProvider } from "../../../main/typescript";

test("Reports failures with meaningful information", async (t: Test) => {
  const logLevel: LogLevelDesc = "TRACE";

  test("Handles timeout/connection refusal transparently", async (t2: Test) => {
    const httpServer1 = await Servers.startOnPreferredPort(4050);
    test.onFinish(() => Servers.shutdown(httpServer1));
    const addressInfo1 = httpServer1.address() as AddressInfo;
    const apiHost = `http://${addressInfo1.address}:${addressInfo1.port}`;

    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumApi({
        basePath: apiHost,
        baseOptions: {
          timeout: 100,
        },
      }),
    });

    try {
      await provider.get();
      t2.fail("Provider.get() did not throw despite API errors.");
    } catch (ex) {
      t2.ok(ex, "Thrown error truthy OK");
      t2.ok(ex.message, "Thrown error.message truthy OK");
      t2.equal(
        typeof ex.message,
        "string",
        "Thrown error.message type string OK"
      );
      t2.true(ex.message.includes("timeout"), "Has timeout in msg OK");
    }
    t2.end();
  });

  test("Handles 4xx transparently", async (t2: Test) => {
    const provider = new DefaultConsortiumProvider({
      logLevel,
      apiClient: new ConsortiumApi({
        basePath: "https://httpbin.org/status/400",
      }),
    });

    try {
      await provider.get();
      t2.fail("Provider.get() did not throw despite API errors.");
    } catch (ex) {
      t2.ok(ex, "Thrown error truthy OK");
      t2.ok(ex.message, "Thrown error.message truthy OK");
      t2.equal(
        typeof ex.message,
        "string",
        "Thrown error.message type string OK"
      );
      t2.true(
        ex.message.includes("status code 404"),
        "Has Status Code in msg OK"
      );
    }
    t2.end();
  });

  t.end();
});
