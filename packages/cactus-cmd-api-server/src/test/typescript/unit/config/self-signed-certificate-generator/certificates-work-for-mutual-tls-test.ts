// tslint:disable-next-line: no-var-requires
const tap = require("tap");
import { AddressInfo } from "net";
import { TLSSocket } from "tls";
import {
  Server,
  createServer,
  request,
  RequestOptions,
  ServerOptions,
} from "https";
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

  const serverCert: IPki = generator.create("localhost");
  assert.ok(serverCert, "serverCert truthy");
  assert.ok(serverCert.certificatePem, "serverCert.certificatePem truthy");
  assert.ok(serverCert.privateKeyPem, "serverCert.privateKeyPem truthy");
  assert.ok(serverCert.certificate, "serverCert.certificate truthy");
  assert.ok(serverCert.keyPair, "serverCert.keyPair truthy");

  // make sure the client cert has a different common name otherwise they collide and everything breaks in this test
  const clientCert: IPki = generator.create("client.localhost", serverCert);
  assert.ok(clientCert, "clientCert truthy");
  assert.ok(clientCert.certificatePem, "clientCert.certificatePem truthy");
  assert.ok(clientCert.privateKeyPem, "clientCert.privateKeyPem truthy");
  assert.ok(clientCert.certificate, "clientCert.certificate truthy");
  assert.ok(clientCert.keyPair, "clientCert.keyPair truthy");
  assert.ok(
    serverCert.certificate.verify(clientCert.certificate),
    "Server cert verified client cert OK"
  );

  const serverOptions: ServerOptions = {
    key: serverCert.privateKeyPem,
    cert: serverCert.certificatePem,

    ca: [serverCert.certificatePem],

    rejectUnauthorized: true,
    requestCert: true,
  };

  const MESSAGE = "hello world\n";

  const server: Server = await new Promise((resolve, reject) => {
    const listener = (aRequest: any, aResponse: any) => {
      aResponse.writeHead(200);
      aResponse.end(MESSAGE);
    };
    const aServer: Server = createServer(serverOptions, listener);
    aServer.once("tlsClientError", (err: Error) =>
      log.error("tlsClientError: %j", err)
    );
    aServer.on("keylog", (data: Buffer, tlsSocket: TLSSocket) => {
      log.debug("keylog:tlsSocket.address(): %j", tlsSocket.address());
      log.debug("keylog:data: %j", data.toString("utf-8"));
    });
    aServer.on("OCSPRequest", (...args: any[]) =>
      log.debug("OCSPRequest: %j", args)
    );
    aServer.on("secureConnection", (tlsSocket: TLSSocket) =>
      log.debug("secureConnection: tlsSocket.address() %j", tlsSocket.address())
    );

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
      // This is fine for a test case because we don't want thid party dependencies on test execution.
      ca: [serverCert.certificatePem],
      rejectUnauthorized: true,

      // We present the server with the client's certificate to put the "mutual" in mTLS for real.
      key: clientCert.privateKeyPem,
      cert: clientCert.certificatePem,
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
