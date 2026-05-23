import "jest-extended";
import Docker from "dockerode";
import { Container } from "dockerode";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  safeStopAndRemoveContainer,
  runCleanup,
  cleanupContainers,
  cleanupEnvs,
  cleanupGatewayRunners,
  cleanupGateways,
  cleanupKnexClients,
} from "../test-utils";
import net from "net";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "docker-cleanup-test",
});

describe("Docker cleanup and port conflict prevention", () => {
  describe("safeStopAndRemoveContainer", () => {
    it("should be a no-op when container is undefined", async () => {
      await expect(
        safeStopAndRemoveContainer(undefined, "test-undefined", log),
      ).resolves.not.toThrow();
    });

    it("should not throw when stop() fails", async () => {
      const mockContainer = {
        stop: jest.fn().mockRejectedValue(new Error("already stopped")),
        remove: jest.fn().mockResolvedValue(undefined),
      } as unknown as Container;

      await expect(
        safeStopAndRemoveContainer(mockContainer, "test-stop-fail", log),
      ).resolves.not.toThrow();

      expect(mockContainer.stop).toHaveBeenCalledTimes(1);
      expect(mockContainer.remove).toHaveBeenCalledTimes(1);
    });

    it("should not throw when remove() fails", async () => {
      const mockContainer = {
        stop: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockRejectedValue(new Error("already removed")),
      } as unknown as Container;

      await expect(
        safeStopAndRemoveContainer(mockContainer, "test-remove-fail", log),
      ).resolves.not.toThrow();

      expect(mockContainer.stop).toHaveBeenCalledTimes(1);
      expect(mockContainer.remove).toHaveBeenCalledTimes(1);
    });

    it("should not throw when both stop() and remove() fail", async () => {
      const mockContainer = {
        stop: jest.fn().mockRejectedValue(new Error("stop boom")),
        remove: jest.fn().mockRejectedValue(new Error("remove boom")),
      } as unknown as Container;

      await expect(
        safeStopAndRemoveContainer(mockContainer, "test-both-fail", log),
      ).resolves.not.toThrow();

      expect(mockContainer.stop).toHaveBeenCalledTimes(1);
      expect(mockContainer.remove).toHaveBeenCalledTimes(1);
    });

    it("should call both stop and remove on success", async () => {
      const mockContainer = {
        stop: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      } as unknown as Container;

      // prettier-ignore
      await safeStopAndRemoveContainer(mockContainer, "test-success", log);

      expect(mockContainer.stop).toHaveBeenCalledTimes(1);
      expect(mockContainer.remove).toHaveBeenCalledTimes(1);
    });

    it("should still call remove even when stop throws", async () => {
      const callOrder: string[] = [];
      const mockContainer = {
        stop: jest.fn().mockImplementation(async () => {
          callOrder.push("stop");
          throw new Error("stop error");
        }),
        remove: jest.fn().mockImplementation(async () => {
          callOrder.push("remove");
        }),
      } as unknown as Container;

      // prettier-ignore
      await safeStopAndRemoveContainer(mockContainer, "test-order", log);

      expect(callOrder).toEqual(["stop", "remove"]);
    });
  });

  describe("runCleanup", () => {
    it("should execute all tasks and return empty errors on success", async () => {
      const fn1 = jest.fn().mockResolvedValue(undefined);
      const fn2 = jest.fn().mockResolvedValue(undefined);

      const errors = await runCleanup(log, [
        { label: "task1", fn: fn1 },
        { label: "task2", fn: fn2 },
      ]);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(0);
    });

    it("should continue after a task fails and collect errors", async () => {
      const fn1 = jest.fn().mockRejectedValue(new Error("boom"));
      const fn2 = jest.fn().mockResolvedValue(undefined);
      const fn3 = jest.fn().mockRejectedValue(new Error("kaboom"));

      const errors = await runCleanup(log, [
        { label: "failing1", fn: fn1 },
        { label: "passing", fn: fn2 },
        { label: "failing2", fn: fn3 },
      ]);

      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(2);
    });

    it("should return empty array for an empty task list", async () => {
      const errors = await runCleanup(log, []);
      expect(errors).toHaveLength(0);
    });
  });

  describe("cleanupContainers", () => {
    it("should generate stop+remove tasks for each defined container", () => {
      const c1 = { stop: jest.fn(), remove: jest.fn() } as unknown as Container;
      const tasks = cleanupContainers({ db_local: c1, db_remote: undefined });

      expect(tasks).toHaveLength(2); // stop + remove for c1
      expect(tasks[0].label).toBe("db_local.stop");
      expect(tasks[1].label).toBe("db_local.remove");
    });

    it("should skip undefined containers", () => {
      const tasks = cleanupContainers({ a: undefined, b: undefined });
      expect(tasks).toHaveLength(0);
    });
  });

  describe("cleanupEnvs", () => {
    it("should generate tearDown tasks for each defined env", () => {
      const env1 = { tearDown: jest.fn() };
      const tasks = cleanupEnvs({ besuEnv: env1, fabricEnv: undefined });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].label).toBe("besuEnv.tearDown");
    });

    it("should skip undefined envs", () => {
      const tasks = cleanupEnvs({ a: undefined });
      expect(tasks).toHaveLength(0);
    });

    it("should integrate with runCleanup end-to-end", async () => {
      const env1 = {
        tearDown: jest.fn().mockRejectedValue(new Error("env1 down")),
      };
      const env2 = { tearDown: jest.fn().mockResolvedValue(undefined) };
      const c1 = {
        stop: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      } as unknown as Container;

      const errors = await runCleanup(log, [
        ...cleanupContainers({ db: c1 }),
        ...cleanupEnvs({ env1, env2 }),
      ]);

      expect(c1.stop).toHaveBeenCalledTimes(1);
      expect(c1.remove).toHaveBeenCalledTimes(1);
      expect(env1.tearDown).toHaveBeenCalledTimes(1);
      expect(env2.tearDown).toHaveBeenCalledTimes(1);
      expect(errors).toHaveLength(1); // only env1 failed
    });
  });

  describe("cleanupGatewayRunners", () => {
    it("should generate stop+destroy tasks for each defined runner", () => {
      const r1 = {
        stop: jest.fn().mockResolvedValue(undefined),
        destroy: jest.fn().mockResolvedValue(undefined),
      };
      const tasks = cleanupGatewayRunners({
        gatewayRunner: r1,
        missing: undefined,
      });

      expect(tasks).toHaveLength(2);
      expect(tasks[0].label).toBe("gatewayRunner.stop");
      expect(tasks[1].label).toBe("gatewayRunner.destroy");
    });

    it("should skip undefined runners", () => {
      const tasks = cleanupGatewayRunners({ a: undefined });
      expect(tasks).toHaveLength(0);
    });
  });

  describe("cleanupGateways", () => {
    it("should generate shutdown tasks for each defined gateway", () => {
      const gw1 = { shutdown: jest.fn().mockResolvedValue(undefined) };
      const gw2 = { shutdown: jest.fn().mockResolvedValue(undefined) };
      const tasks = cleanupGateways({
        gateway1: gw1,
        gateway2: gw2,
        missing: undefined,
      });

      expect(tasks).toHaveLength(2);
      expect(tasks[0].label).toBe("gateway1.shutdown");
      expect(tasks[1].label).toBe("gateway2.shutdown");
    });

    it("should skip undefined gateways", () => {
      const tasks = cleanupGateways({ a: undefined });
      expect(tasks).toHaveLength(0);
    });
  });

  describe("cleanupKnexClients", () => {
    it("should generate destroy tasks for each defined client", () => {
      const k1 = { destroy: jest.fn().mockResolvedValue(undefined) };
      const k2 = { destroy: jest.fn().mockResolvedValue(undefined) };
      const tasks = cleanupKnexClients({
        knexLocal: k1,
        knexRemote: k2,
        missing: undefined,
      });

      expect(tasks).toHaveLength(2);
      expect(tasks[0].label).toBe("knexLocal.destroy");
      expect(tasks[1].label).toBe("knexRemote.destroy");
    });

    it("should skip undefined clients", () => {
      const tasks = cleanupKnexClients({ a: undefined });
      expect(tasks).toHaveLength(0);
    });
  });

  describe("Port conflict detection", () => {
    it("should detect when a port is already in use", async () => {
      // Bind a port to simulate a stale container holding it
      const server = net.createServer();
      const port = await new Promise<number>((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            resolve(addr.port);
          } else {
            reject(new Error("Failed to get port"));
          }
        });
      });

      // Verify the port is occupied
      const isOccupied = await checkPortOccupied(port, "127.0.0.1");
      expect(isOccupied).toBe(true);

      // Clean up
      await new Promise<void>((resolve) => server.close(() => resolve()));

      // Verify the port is now free
      const isFree = await checkPortOccupied(port, "127.0.0.1");
      expect(isFree).toBe(false);
    });

    it("should report free port as not occupied", async () => {
      // Use port 0 to get an ephemeral port, then release it
      const server = net.createServer();
      const port = await new Promise<number>((resolve, reject) => {
        server.listen(0, "127.0.0.1", () => {
          const addr = server.address();
          if (addr && typeof addr === "object") {
            resolve(addr.port);
          } else {
            reject(new Error("Failed to get port"));
          }
        });
      });
      await new Promise<void>((resolve) => server.close(() => resolve()));

      const isOccupied = await checkPortOccupied(port, "127.0.0.1");
      expect(isOccupied).toBe(false);
    });
  });

  describe("Fabric AIO port bindings conflict scenario", () => {
    // These are the hardcoded ports from FabricTestLedgerV1.start()
    const FABRIC_AIO_PORTS = [30022, 7050, 7051, 7054, 8051, 8054, 9051, 10051];

    it("should identify which Fabric ports are currently free", async () => {
      const results = await Promise.all(
        FABRIC_AIO_PORTS.map(async (port) => ({
          port,
          occupied: await checkPortOccupied(port, "0.0.0.0"),
        })),
      );

      const occupied = results.filter((r) => r.occupied);
      const free = results.filter((r) => !r.occupied);

      log.info(
        `Fabric AIO ports: ${free.length} free, ${occupied.length} occupied`,
      );
      if (occupied.length > 0) {
        log.warn(
          "Occupied Fabric ports (stale containers?): " +
            occupied.map((r) => r.port).join(", "),
        );
      }

      // This test documents the state — it passes regardless.
      // If ports are occupied, other tests in this describe block
      // can detect and report them.
      expect(results).toBeDefined();
    });

    it("should detect stale Fabric containers by image name", async () => {
      const docker = new Docker();
      let containers: Docker.ContainerInfo[];
      try {
        containers = await Promise.race([
          docker.listContainers({ all: true }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Docker API timed out")), 5_000),
          ),
        ]);
      } catch (err) {
        log.warn("Docker API unavailable, skipping container check:", err);
        return; // skip — Docker daemon not reachable
      }

      const fabricContainers = containers.filter(
        (c) => c.Image.includes("fabric") || c.Image.includes("cactus-fabric"),
      );

      if (fabricContainers.length > 0) {
        log.warn(
          `Found ${fabricContainers.length} Fabric container(s) that ` +
            "may be stale from a previous test run:",
        );
        for (const c of fabricContainers) {
          log.warn(
            `  ${c.Id.substring(0, 12)} ${c.Image} ${c.State} ${c.Status}`,
          );
        }
      } else {
        log.info("No stale Fabric containers found — Docker state is clean");
      }

      // Informational — always passes
      expect(fabricContainers).toBeDefined();
    });
  });
});

/**
 * Check if a TCP port is occupied on the given host.
 * Attempts to create a server on the port — if it fails with EADDRINUSE,
 * the port is occupied.
 */
function checkPortOccupied(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        // Other errors (e.g. EACCES for privileged ports) — treat as occupied
        resolve(true);
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(false));
    });
    server.listen(port, host);
  });
}
