import { createHmac } from "crypto";
import os from "os";
import path from "path";

import { Container, ContainerInspectInfo } from "dockerode";
import Docker from "dockerode";
import fs from "fs-extra";
import yaml from "js-yaml";

import {
  CANTON_LOCALNET_SOURCE_REVISION,
  CANTON_LOCALNET_VERSION,
  CantonTestLedger,
  ICantonTestLedgerConnectionInfo,
} from "../../../../main/typescript/canton/canton-test-ledger";

const COMPOSE_VERSION_ARGS = ["compose", "version", "--short"];

const INSPECT_INFO = {
  State: { Health: { Status: "healthy" }, Running: true },
  NetworkSettings: {
    Ports: {
      "3901/tcp": [{ HostIp: "127.0.0.1", HostPort: "49101" }],
      "3902/tcp": [{ HostIp: "127.0.0.1", HostPort: "49102" }],
      "3975/tcp": [{ HostIp: "127.0.0.1", HostPort: "49175" }],
    },
  },
} as unknown as ContainerInspectInfo;

interface IFixture {
  readonly directory: string;
}

async function createLocalNetFixture(): Promise<IFixture> {
  const directory = await fs.mkdtemp(
    path.join(await fs.realpath(os.tmpdir()), "canton-localnet-fixture-"),
  );
  return { directory };
}

class StubCantonTestLedger extends CantonTestLedger {
  public readonly commands: string[][] = [];
  public readonly commandTimeouts: (number | undefined)[] = [];
  public composeVersion = "2.20.2";
  public dockerContext = "default";
  public downloadedAssets?: string[];
  public inspectionSequence: ContainerInspectInfo[] = [];
  public inspectInfo = INSPECT_INFO;
  public inspectCount = 0;
  public failConfig = false;
  public failNextDown = false;
  public failUp = false;

  protected createDockerClient(): Docker {
    const container = {
      inspect: async () => {
        this.inspectCount += 1;
        return this.inspectionSequence.shift() ?? this.inspectInfo;
      },
    } as Container;
    return {
      getContainer: () => container,
    } as unknown as Docker;
  }

  protected async downloadAsset(relativePath: string): Promise<Buffer> {
    if (!this.downloadedAssets) {
      return super.downloadAsset(relativePath);
    }
    this.downloadedAssets.push(relativePath);
    if (relativePath === "compose.yaml") {
      return Buffer.from(
        yaml.dump({
          services: {
            canton: { container_name: "canton", image: "canton-fixture" },
            postgres: {
              container_name: "postgres",
              image: "postgres-fixture",
            },
            splice: {
              container_name: "splice",
              environment: ["CANTON_PROTOCOL_VERSION"],
              image: "splice-fixture",
            },
          },
        }),
      );
    }
    if (relativePath === "resource-constraints.yaml") {
      return Buffer.from(yaml.dump({ services: {} }));
    }
    return Buffer.from(`fixture for ${relativePath}\n`);
  }

  protected async execDocker(
    args: readonly string[],
    timeoutMs?: number,
  ): Promise<string> {
    this.commands.push([...args]);
    this.commandTimeouts.push(timeoutMs);
    if (args.join(" ") === "context show") {
      return this.dockerContext;
    }
    if (args.join(" ") === COMPOSE_VERSION_ARGS.join(" ")) {
      return this.composeVersion;
    }
    if (args.includes("config") && this.failConfig) {
      throw new Error("simulated Compose configuration failure");
    }
    if (args.includes("up") && this.failUp) {
      throw new Error("simulated Compose startup failure");
    }
    if (args.includes("down") && this.failNextDown) {
      this.failNextDown = false;
      throw new Error("simulated Compose cleanup failure");
    }
    if (args.includes("ps")) {
      return "canton-container-id";
    }
    if (args.includes("inspect")) {
      return '{"Status":"unhealthy"}';
    }
    if (args.includes("logs")) {
      return "bounded startup diagnostics";
    }
    return "";
  }

  public dockerEnvironment(): NodeJS.ProcessEnv {
    return this.getDockerEnvironment();
  }

  protected waitForHealthPollInterval(): Promise<void> {
    return Promise.resolve();
  }
}

function commandIndex(
  commands: readonly (readonly string[])[],
  command: string,
): number {
  return commands.findIndex((args) => args.includes(command));
}

function composeWorkspace(commands: readonly (readonly string[])[]): string {
  const configArgs = commands.find((args) => args.includes("config"));
  if (!configArgs) {
    throw new Error("Compose config command was not executed.");
  }
  const fileIndex = configArgs.indexOf("--file");
  if (fileIndex < 0 || !configArgs[fileIndex + 1]) {
    throw new Error("Generated Compose file argument was not found.");
  }
  return path.dirname(configArgs[fileIndex + 1]);
}

describe("CantonTestLedger", () => {
  const fixtures: string[] = [];

  afterEach(async () => {
    await Promise.all(fixtures.splice(0).map((fixture) => fs.remove(fixture)));
  });

  it("validates constructor options", () => {
    expect(() => new CantonTestLedger({ cacheDirectory: " " })).toThrow(
      /cacheDirectory cannot be blank/,
    );
    expect(() => new CantonTestLedger({ startTimeoutMs: 0 })).toThrow(
      /positive safe integer/,
    );
  });

  it("rejects unsupported Docker Compose versions before downloading", async () => {
    const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
    ledger.downloadedAssets = [];
    ledger.composeVersion = "2.20.1";

    await expect(ledger.start()).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringMatching(/2\.20\.2 or newer/),
      }),
    });
    expect(ledger.downloadedAssets).toHaveLength(0);
  });

  it("rejects DOCKER_CONTEXT before starting Compose", async () => {
    const previousDockerContext = process.env.DOCKER_CONTEXT;
    process.env.DOCKER_CONTEXT = "remote-engine";
    try {
      const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
      ledger.downloadedAssets = [];

      await expect(ledger.start()).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: expect.stringMatching(/remote-engine.*not supported/),
        }),
      });
      expect(ledger.downloadedAssets).toHaveLength(0);
      expect(ledger.commands).toHaveLength(0);
    } finally {
      if (previousDockerContext === undefined) {
        delete process.env.DOCKER_CONTEXT;
      } else {
        process.env.DOCKER_CONTEXT = previousDockerContext;
      }
    }
  });

  it("rejects a non-default active context without DOCKER_HOST", async () => {
    const previousDockerContext = process.env.DOCKER_CONTEXT;
    const previousDockerHost = process.env.DOCKER_HOST;
    delete process.env.DOCKER_CONTEXT;
    delete process.env.DOCKER_HOST;
    try {
      const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
      ledger.downloadedAssets = [];
      ledger.dockerContext = "remote-engine";

      await expect(ledger.start()).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: expect.stringMatching(/remote-engine.*not supported/),
        }),
      });
      expect(ledger.downloadedAssets).toHaveLength(0);
      expect(ledger.commands).toEqual([["context", "show"]]);
    } finally {
      if (previousDockerContext === undefined) {
        delete process.env.DOCKER_CONTEXT;
      } else {
        process.env.DOCKER_CONTEXT = previousDockerContext;
      }
      if (previousDockerHost === undefined) {
        delete process.env.DOCKER_HOST;
      } else {
        process.env.DOCKER_HOST = previousDockerHost;
      }
    }
  });

  it("rejects conflicting DOCKER_CONTEXT and DOCKER_HOST", async () => {
    const previousDockerContext = process.env.DOCKER_CONTEXT;
    const previousDockerHost = process.env.DOCKER_HOST;
    process.env.DOCKER_CONTEXT = "default";
    process.env.DOCKER_HOST = "unix:///var/run/docker.sock";
    try {
      const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
      ledger.downloadedAssets = [];

      await expect(ledger.start()).rejects.toMatchObject({
        cause: expect.objectContaining({
          message: expect.stringMatching(/cannot be used together/),
        }),
      });
      expect(ledger.downloadedAssets).toHaveLength(0);
      expect(ledger.commands).toHaveLength(0);
    } finally {
      if (previousDockerContext === undefined) {
        delete process.env.DOCKER_CONTEXT;
      } else {
        process.env.DOCKER_CONTEXT = previousDockerContext;
      }
      if (previousDockerHost === undefined) {
        delete process.env.DOCKER_HOST;
      } else {
        process.env.DOCKER_HOST = previousDockerHost;
      }
    }
  });

  it.each(["tcp://docker.example:2376", "ssh://docker.example"])(
    "rejects remote DOCKER_HOST %s before starting Compose",
    async (dockerHost) => {
      const previousDockerContext = process.env.DOCKER_CONTEXT;
      const previousDockerHost = process.env.DOCKER_HOST;
      delete process.env.DOCKER_CONTEXT;
      process.env.DOCKER_HOST = dockerHost;
      try {
        const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
        ledger.downloadedAssets = [];

        await expect(ledger.start()).rejects.toMatchObject({
          cause: expect.objectContaining({
            message: expect.stringMatching(/Remote DOCKER_HOST.*not supported/),
          }),
        });
        expect(ledger.downloadedAssets).toHaveLength(0);
        expect(ledger.commands).toHaveLength(0);
      } finally {
        if (previousDockerContext === undefined) {
          delete process.env.DOCKER_CONTEXT;
        } else {
          process.env.DOCKER_CONTEXT = previousDockerContext;
        }
        if (previousDockerHost === undefined) {
          delete process.env.DOCKER_HOST;
        } else {
          process.env.DOCKER_HOST = previousDockerHost;
        }
      }
    },
  );

  it.each([
    {
      dockerContext: "default",
      dockerHost: undefined,
      name: "the default Docker context",
    },
    {
      dockerContext: undefined,
      dockerHost: "unix:///var/run/docker.sock",
      name: "DOCKER_HOST",
    },
  ])("accepts $name", async ({ dockerContext, dockerHost }) => {
    const previousDockerContext = process.env.DOCKER_CONTEXT;
    const previousDockerHost = process.env.DOCKER_HOST;
    if (dockerContext === undefined) {
      delete process.env.DOCKER_CONTEXT;
    } else {
      process.env.DOCKER_CONTEXT = dockerContext;
    }
    if (dockerHost === undefined) {
      delete process.env.DOCKER_HOST;
    } else {
      process.env.DOCKER_HOST = dockerHost;
    }

    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
      logLevel: "SILENT",
    });
    ledger.downloadedAssets = [];
    try {
      await ledger.start();
      expect(ledger.commands).not.toContainEqual(["context", "show"]);
    } finally {
      await ledger.destroy();
      if (previousDockerContext === undefined) {
        delete process.env.DOCKER_CONTEXT;
      } else {
        process.env.DOCKER_CONTEXT = previousDockerContext;
      }
      if (previousDockerHost === undefined) {
        delete process.env.DOCKER_HOST;
      } else {
        process.env.DOCKER_HOST = previousDockerHost;
      }
    }
  });

  it("starts isolated LocalNet services and reports dynamic ports", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
      startTimeoutMs: 12_345,
    });
    ledger.downloadedAssets = [];

    await ledger.start();
    const connectionInfo: ICantonTestLedgerConnectionInfo =
      await ledger.getConnectionInfo();

    expect(connectionInfo).toEqual({
      adminApiAddress: "127.0.0.1:49102",
      jsonLedgerApiHost: "http://127.0.0.1:49175",
      ledgerApiAddress: "127.0.0.1:49101",
      ledgerApiAuthToken: expect.any(String),
    });
    const [header, payload, signature] =
      connectionInfo.ledgerApiAuthToken.split(".");
    expect(JSON.parse(Buffer.from(header, "base64url").toString())).toEqual({
      alg: "HS256",
      typ: "JWT",
    });
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual(
      expect.objectContaining({
        aud: "https://canton.network.global",
        sub: "ledger-api-user",
      }),
    );
    expect(signature).toBe(
      createHmac("sha256", "unsafe")
        .update(`${header}.${payload}`)
        .digest("base64url"),
    );
    expect(ledger.inspectCount).toBe(5);
    expect(commandIndex(ledger.commands, "config")).toBeLessThan(
      commandIndex(ledger.commands, "up"),
    );

    const upArgs = ledger.commands[commandIndex(ledger.commands, "up")];
    expect(ledger.commandTimeouts[commandIndex(ledger.commands, "up")]).toBe(
      42_345,
    );
    expect(upArgs).toEqual(
      expect.arrayContaining(["--detach", "postgres", "canton", "splice"]),
    );
    expect(upArgs).not.toContain("--wait");
    expect(ledger.dockerEnvironment()).toEqual(
      expect.objectContaining({
        APP_PROVIDER_PROFILE: "on",
        APP_USER_PROFILE: "off",
        IMAGE_TAG: CANTON_LOCALNET_VERSION,
        PARTY_HINT: "cacti-test-1",
        SV_PROFILE: "on",
        TEST_PORT: "127.0.0.1::",
      }),
    );
    expect(upArgs).toEqual(
      expect.arrayContaining([
        "--project-name",
        ledger.getProjectName(),
        "--profile",
        "sv",
        "app-provider",
      ]),
    );
    expect(upArgs).not.toContain("app-user");

    const workspace = composeWorkspace(ledger.commands);
    const generatedCompose = yaml.load(
      await fs.readFile(path.join(workspace, "compose.cacti.yaml"), "utf8"),
    ) as { services: Record<string, Record<string, unknown>> };
    expect(
      Object.values(generatedCompose.services).every(
        (service) => service.container_name === undefined,
      ),
    ).toBe(true);
    expect(generatedCompose.services.canton.environment).toEqual({
      LOG_LEVEL_STDOUT: "INFO",
    });
    expect(generatedCompose.services.splice.environment).toEqual([
      "CANTON_PROTOCOL_VERSION",
      "LOG_LEVEL_STDOUT=INFO",
    ]);

    await ledger.stop();
    await ledger.destroy();
    expect(commandIndex(ledger.commands, "stop")).toBeLessThan(
      commandIndex(ledger.commands, "down"),
    );
    expect(await fs.pathExists(workspace)).toBe(false);
  });

  it("serializes overlapping lifecycle calls", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
    });
    ledger.downloadedAssets = [];

    await Promise.all([ledger.start(), ledger.stop(), ledger.destroy()]);

    expect(commandIndex(ledger.commands, "up")).toBeLessThan(
      commandIndex(ledger.commands, "stop"),
    );
    expect(commandIndex(ledger.commands, "stop")).toBeLessThan(
      commandIndex(ledger.commands, "down"),
    );
    expect(() => ledger.getContainer()).toThrow(/has not been started/);
  });

  it("tolerates a transient service restart while waiting for health", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
    });
    ledger.downloadedAssets = [];
    ledger.inspectionSequence = Array.from({ length: 3 }, () => {
      return {
        State: {
          Health: { Status: "starting" },
          Restarting: true,
          Running: true,
        },
      } as unknown as ContainerInspectInfo;
    });

    await ledger.start();

    expect(ledger.inspectCount).toBe(7);
    await ledger.destroy();
  });

  it("shares one atomic LocalNet download between concurrent ledgers", async () => {
    const cacheDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), "canton-localnet-cache-"),
    );
    fixtures.push(cacheDirectory);
    const downloadedAssets: string[] = [];
    const firstLedger = new StubCantonTestLedger({ cacheDirectory });
    const secondLedger = new StubCantonTestLedger({ cacheDirectory });
    firstLedger.downloadedAssets = downloadedAssets;
    secondLedger.downloadedAssets = downloadedAssets;

    await Promise.all([firstLedger.start(), secondLedger.start()]);

    expect(downloadedAssets.length).toBeGreaterThan(40);
    expect(new Set(downloadedAssets).size).toBe(downloadedAssets.length);
    const assetCount = downloadedAssets.length;
    expect(firstLedger.getProjectName()).not.toBe(
      secondLedger.getProjectName(),
    );

    await Promise.all([firstLedger.destroy(), secondLedger.destroy()]);

    const cachedLedger = new StubCantonTestLedger({ cacheDirectory });
    cachedLedger.downloadedAssets = downloadedAssets;
    await cachedLedger.start();
    expect(downloadedAssets).toHaveLength(assetCount);
    await cachedLedger.destroy();

    await fs.remove(
      path.join(
        cacheDirectory,
        String(process.pid),
        CANTON_LOCALNET_SOURCE_REVISION,
        "compose.yaml",
      ),
    );
    const repairingLedger = new StubCantonTestLedger({ cacheDirectory });
    repairingLedger.downloadedAssets = downloadedAssets;
    await repairingLedger.start();
    expect(downloadedAssets).toHaveLength(assetCount * 2);
    await repairingLedger.destroy();
  });

  it("collects logs and removes resources after startup failure", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
    });
    ledger.downloadedAssets = [];
    ledger.failUp = true;

    await expect(ledger.start()).rejects.toThrow(/start\(\) failed/);

    expect(commandIndex(ledger.commands, "logs")).toBeGreaterThan(
      commandIndex(ledger.commands, "up"),
    );
    expect(commandIndex(ledger.commands, "down")).toBeGreaterThan(
      commandIndex(ledger.commands, "logs"),
    );
    const inspect = ledger.commands[commandIndex(ledger.commands, "inspect")];
    expect(inspect).toEqual(
      expect.arrayContaining([
        "--format",
        "{{json .State}}",
        "canton-container-id",
      ]),
    );
    const logs = ledger.commands[commandIndex(ledger.commands, "logs")];
    expect(logs).toEqual(expect.arrayContaining(["--tail", "1000", "splice"]));
    expect(await fs.pathExists(composeWorkspace(ledger.commands))).toBe(false);
  });

  it("removes its workspace when Compose validation fails", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
      logLevel: "SILENT",
    });
    ledger.downloadedAssets = [];
    ledger.failConfig = true;

    await expect(ledger.start()).rejects.toThrow(/start\(\) failed/);

    expect(ledger.commands.some((args) => args.includes("down"))).toBe(false);
    expect(await fs.pathExists(composeWorkspace(ledger.commands))).toBe(false);
  });

  it.each([
    {
      bindings: [
        { HostIp: "127.0.0.1", HostPort: "49101" },
        { HostIp: "0.0.0.0", HostPort: "49101" },
      ],
      expectedError: /exactly one published binding/,
      name: "multiple port bindings",
    },
    {
      bindings: [{ HostIp: "::1", HostPort: "49101" }],
      expectedError: /expected IPv4 loopback only/,
      name: "an IPv6-only binding",
    },
    {
      bindings: [{ HostIp: "0.0.0.0", HostPort: "49101" }],
      expectedError: /expected IPv4 loopback only/,
      name: "a wildcard binding",
    },
  ])("rejects $name", async ({ bindings, expectedError }) => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
      logLevel: "SILENT",
    });
    ledger.downloadedAssets = [];
    ledger.inspectInfo = {
      ...INSPECT_INFO,
      NetworkSettings: {
        ...INSPECT_INFO.NetworkSettings,
        Ports: {
          ...INSPECT_INFO.NetworkSettings.Ports,
          "3901/tcp": bindings,
        },
      },
    };

    await ledger.start();
    await expect(ledger.getConnectionInfo()).rejects.toThrow(expectedError);
    await ledger.destroy();
  });

  it("does not pass ambient Compose overrides to Docker", () => {
    const previousImageTag = process.env.IMAGE_TAG;
    const previousComposeProjectName = process.env.COMPOSE_PROJECT_NAME;
    process.env.IMAGE_TAG = "hostile-image-tag";
    process.env.COMPOSE_PROJECT_NAME = "hostile-project";
    try {
      const ledger = new StubCantonTestLedger({ logLevel: "SILENT" });
      const environment = ledger.dockerEnvironment();
      expect(environment.IMAGE_TAG).toBeUndefined();
      expect(environment.COMPOSE_PROJECT_NAME).toBeUndefined();
      expect(environment.PATH).toBe(process.env.PATH);
    } finally {
      if (previousImageTag === undefined) {
        delete process.env.IMAGE_TAG;
      } else {
        process.env.IMAGE_TAG = previousImageTag;
      }
      if (previousComposeProjectName === undefined) {
        delete process.env.COMPOSE_PROJECT_NAME;
      } else {
        process.env.COMPOSE_PROJECT_NAME = previousComposeProjectName;
      }
    }
  });

  it("retains cleanup state when Compose down fails and supports retry", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
    });
    ledger.downloadedAssets = [];
    ledger.failUp = true;
    ledger.failNextDown = true;

    await expect(ledger.start()).rejects.toThrow(/start\(\) failed/);
    const workspace = composeWorkspace(ledger.commands);
    expect(await fs.pathExists(workspace)).toBe(true);

    await ledger.destroy();
    expect(
      ledger.commands.filter((args) => args.includes("down")),
    ).toHaveLength(2);
    expect(await fs.pathExists(workspace)).toBe(false);
  });

  it("removes a pending workspace before starting a new one", async () => {
    const fixture = await createLocalNetFixture();
    fixtures.push(fixture.directory);
    const ledger = new StubCantonTestLedger({
      cacheDirectory: fixture.directory,
    });
    ledger.downloadedAssets = [];

    await ledger.start();
    const firstWorkspace = composeWorkspace(ledger.commands);
    const remove = fs.remove.bind(fs);
    const removeSpy = jest.spyOn(fs, "remove");
    let remainingFailures = 2;
    removeSpy.mockImplementation(async (target) => {
      if (target === firstWorkspace && remainingFailures > 0) {
        remainingFailures -= 1;
        throw new Error("simulated workspace cleanup failure");
      }
      return remove(target);
    });

    try {
      await expect(ledger.destroy()).rejects.toThrow(
        /simulated workspace cleanup failure/,
      );
      await expect(ledger.start()).rejects.toThrow(
        /simulated workspace cleanup failure/,
      );
      expect(await fs.pathExists(firstWorkspace)).toBe(true);
      expect(
        ledger.commands.filter((args) => args.includes("config")),
      ).toHaveLength(1);

      await ledger.start();
      expect(await fs.pathExists(firstWorkspace)).toBe(false);
      expect(
        ledger.commands.filter((args) => args.includes("config")),
      ).toHaveLength(2);
    } finally {
      removeSpy.mockRestore();
      await ledger.destroy();
    }
  });
});
