/**
 * Integration tests for DEV_MODE TLS relaxation on the gateway GOL server.
 *
 * Covers the three contract points of the DEV_MODE flag:
 *  - DEV_MODE active + TLS enabled without certificate material:
 *    the gateway starts and serves plain HTTP (with a loud warning);
 *  - DEV_MODE inactive + TLS enabled with complete material:
 *    the gateway starts and serves HTTPS (TLS 1.3);
 *  - DEV_MODE inactive + TLS enabled without material:
 *    the gateway stops gracefully with a clear configuration error and
 *    never serves plain HTTP (SATP draft-16 Section 5.4.2).
 */
import "jest-extended";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import https from "node:https";
import * as os from "node:os";
import * as path from "node:path";
import { v4 as uuidv4 } from "uuid";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger-cacti/cactus-common";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import {
  SATPGateway,
  type SATPGatewayConfig,
} from "../../../../main/typescript/plugin-satp-hermes-gateway";
import {
  Address,
  GatewayCredential,
  GatewayIdentity,
  SupportedSigningAlgorithms,
} from "../../../../main/typescript/core/types";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { getFreePort } from "../../test-utils";

const TIMEOUT = 120000;
const logLevel: LogLevelDesc = "ERROR";

/**
 * Issues one request and resolves with the response status code, proving
 * the endpoint speaks the requested protocol. Rejects on connection or
 * protocol errors (which is what the negative assertions rely on).
 */
function requestStatus(
  protocol: "http" | "https",
  port: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const module = protocol === "http" ? http : https;
    const req = module.request(
      {
        host: "localhost",
        port,
        method: "GET",
        path: "/",
        ...(protocol === "https" ? { rejectUnauthorized: false } : {}),
        timeout: 10_000,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("request timeout")));
    req.end();
  });
}

/** Generates a throwaway self-signed certificate for the TLS-ok case. */
async function generateSelfSignedCertificate(): Promise<{
  cert: string;
  key: string;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "satp-dev-mode-tls-"));
  const certPath = path.join(dir, "cert.pem");
  const keyPath = path.join(dir, "key.pem");
  try {
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-nodes",
        "-subj",
        "/CN=localhost",
      ],
      { stdio: "pipe" },
    );
    const [cert, key] = await Promise.all([
      fs.readFile(certPath, "utf8"),
      fs.readFile(keyPath, "utf8"),
    ]);
    return { cert, key };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function buildGatewayConfig(options: {
  serverPort: number;
  devMode: boolean;
  tls: SATPGatewayConfig["tls"];
}): Promise<SATPGatewayConfig> {
  const keyPair = Secp256k1Keys.generateKeyPairsBuffer();
  const gid = {
    id: `dev-mode-gateway-${uuidv4()}`,
    name: "DevModeTestGateway",
    version: [
      {
        Core: SATP_CORE_VERSION,
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    proofID: "dev-mode-test-proof-id",
    address: "http://localhost" as Address,
    gatewayClientPort: await getFreePort(),
    gatewayServerPort: options.serverPort,
    gatewayOapiPort: await getFreePort(),
    credentials: {
      [GatewayCredential.CLAIM_SIGNATURE]: {
        purpose: GatewayCredential.CLAIM_SIGNATURE,
        algorithm: SupportedSigningAlgorithms.SECP256K1,
        publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
      },
    },
  } as GatewayIdentity;

  const monitorService = MonitorService.createOrGetMonitorService({
    enabled: false,
  });
  monitorService.init();

  return {
    instanceId: uuidv4(),
    logLevel,
    gid,
    counterPartyGateways: [],
    keyPair,
    ccConfig: { bridgeConfig: [] },
    devMode: options.devMode,
    tls: options.tls,
    enableCrashRecovery: false,
    pluginRegistry: new PluginRegistry({ plugins: [] }),
    ontologyPath: path.join(__dirname, "../../../ontologies"),
    monitorService,
  };
}

describe("DEV_MODE TLS relaxation (integration)", () => {
  jest.setTimeout(TIMEOUT);

  it("DEV_MODE active: serves the GOL server over plain HTTP despite incomplete TLS material", async () => {
    const serverPort = await getFreePort();
    const config = await buildGatewayConfig({
      serverPort,
      devMode: true,
      tls: { enabled: true }, // no cert, no key
    });

    const gateway = new SATPGateway(config);
    try {
      await gateway.startup();

      // The server must answer plain HTTP (any status, e.g. 404, proves it).
      const status = await requestStatus("http", serverPort);
      expect(status).toBeGreaterThanOrEqual(200);

      // ...and must NOT speak TLS on the same port.
      await expect(requestStatus("https", serverPort)).toReject();
    } finally {
      await gateway.shutdown();
    }
  });

  it("DEV_MODE inactive with complete TLS material: serves the GOL server over HTTPS", async () => {
    const serverPort = await getFreePort();
    const { cert, key } = await generateSelfSignedCertificate();
    const config = await buildGatewayConfig({
      serverPort,
      devMode: false,
      tls: { enabled: true, cert, key },
    });

    const gateway = new SATPGateway(config);
    try {
      await gateway.startup();

      // Self-signed cert: skip authorization, any status proves TLS works.
      const status = await requestStatus("https", serverPort);
      expect(status).toBeGreaterThanOrEqual(200);

      // ...and plain HTTP against the TLS port must fail.
      await expect(requestStatus("http", serverPort)).toReject();
    } finally {
      await gateway.shutdown();
    }
  });

  it("DEV_MODE inactive without TLS material: stops gracefully instead of serving HTTP", async () => {
    const serverPort = await getFreePort();
    const config = await buildGatewayConfig({
      serverPort,
      devMode: false,
      tls: { enabled: true }, // no cert, no key
    });

    // The misconfiguration is rejected up front with a clear error that
    // points at the missing material and the DEV_MODE escape hatch.
    expect(() => new SATPGateway(config)).toThrow(
      /enabled but cert and key missing.*DEV_MODE/s,
    );

    // Graceful stop: nothing is listening on the server port.
    await expect(requestStatus("http", serverPort)).toReject();
  });
});
