const tap = require("tap");
import { AddressInfo } from "net";
import { Server, createServer, request, RequestOptions } from "https";
import {
  SelfSignedPkiGenerator,
  IPki,
} from "../../../../../main/typescript/public-api";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";

const log: Logger = LoggerProvider.getOrCreate({
  label: "test-generates-working-certificates",
  level: "TRACE",
});

tap.test("works with HTTPS NodeJS module", async (assert: any) => {
  assert.ok(SelfSignedPkiGenerator, "class present on API surface");

  const generator = new SelfSignedPkiGenerator();
  assert.ok(generator, "Instantiated SelfSignedCertificateGenerator OK.");
  const serverCertData: IPki = generator.create("localhost");
  assert.ok(serverCertData, "Returned cert data truthy");
  assert.ok(serverCertData.certificatePem, "certData.certificatePem truthy");
  assert.ok(serverCertData.privateKeyPem, "certData.privateKeyPem truthy");
  assert.ok(serverCertData.certificate, "certData.certificate truthy");
  assert.ok(serverCertData.keyPair, "certData.keyPair truthy");

  const serverOptions = {
    key: serverCertData.privateKeyPem,
    cert: serverCertData.certificatePem,
  };

  const MESSAGE = "hello world\n";

  const server: Server = await new Promise((resolve, reject) => {
    const listener = (aRequest: any, aResponse: any) => {
      aResponse.writeHead(200);
      aResponse.end(MESSAGE);
    };
    const aServer: Server = createServer(serverOptions, listener);
    aServer.once("tlsClientError", (err: Error) => {
      log.error("tlsClientError: %j", err);
      reject(err);
    });
    aServer.once("listening", () => resolve(aServer));
    aServer.listen(0, "localhost");
    assert.tearDown(() => aServer.close());
  });

  assert.ok(server, "HTTPS Server object truthy");
  assert.ok(server.listening, "HTTPS Server is indeed listening");

  const addressInfo = server.address() as AddressInfo;
  assert.ok(addressInfo, "HTTPS Server provided truthy AddressInfo");
  assert.ok(addressInfo.port, "HTTPS Server provided truthy AddressInfo.port");
  log.debug("AddressInfo for test HTTPS server: %j", addressInfo);

  const response = await new Promise((resolve, reject) => {
    const requestOptions: RequestOptions = {
      protocol: "https:",
      host: addressInfo.address,
      port: addressInfo.port,
      path: "/",
      method: "GET",

      // IMPORTANT:
      // Without this self signed certs are rejected because they are not part of a chain with a trusted root CA
      // By declaring our certificate here we tell the HTTPS client to assume that our certificate is a trusted one.
      // This is fine for a test case because we don't want this party dependencies on test execution.
      ca: serverCertData.certificatePem,
    };

    const req = request(requestOptions, (res) => {
      res.setEncoding("utf8");

      let body = "";

      res.on("data", (chunk) => {
        body = body + chunk;
      });

      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(`HTTPS request failed. Status code: ${res.statusCode}`);
        } else {
          resolve(body);
        }
      });
    });

    req.on("error", (error) => {
      log.error("Failed to send request: ", error);
      reject(error);
    });
    req.end();
  });

  assert.ok(response, "Server response truthy");
  assert.equal(response, MESSAGE, `Server responded with "${MESSAGE}"`);

  assert.end();
});
