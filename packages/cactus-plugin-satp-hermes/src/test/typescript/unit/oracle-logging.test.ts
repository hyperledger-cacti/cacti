import "jest-extended";
import { Knex } from "knex";
import { KnexOracleLogRepository } from "../../../main/typescript/database/repository/knex-oracle-log-repository";
import {
  OraclePersistence,
  type OracleLogEntry,
} from "../../../main/typescript/database/oracle-persistence";
import { createOracleLogKnexConfig } from "../../../main/typescript/database/knexfile";
import type { OracleLog } from "../../../main/typescript/core/types";
import { MonitorService } from "../../../main/typescript/services/monitoring/monitor";
import { OracleManager } from "../../../main/typescript/cross-chain-mechanisms/oracle/oracle-manager";
import {
  OracleTaskTypeEnum,
  OracleTaskModeEnum,
  OracleTaskStatusEnum,
  type OracleTask,
} from "../../../main/typescript/generated/gateway-client/typescript-axios/api";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

const sqliteConfig: Knex.Config = {
  client: "sqlite3",
  connection: { filename: ":memory:" },
  useNullAsDefault: true,
};

describe("Oracle Logging", () => {
  let repo: KnexOracleLogRepository;
  let persistence: OraclePersistence;

  beforeAll(async () => {
    repo = new KnexOracleLogRepository(sqliteConfig);
    await repo.database.migrate.latest();

    persistence = new OraclePersistence({
      oracleLogRepository: repo,
      logLevel: "DEBUG",
      monitorService,
    });
  });

  afterAll(async () => {
    await repo.destroy();
  });

  afterEach(async () => {
    await repo.getOracleLogsTable().del();
  });

  describe("KnexOracleLogRepository", () => {
    it("creates and reads back an oracle log by key", async () => {
      const log: OracleLog = {
        taskId: "task-1",
        type: "init",
        key: "task-1-init-deployOracle-0",
        operation: "deployOracle",
        timestamp: Date.now().toString(),
        data: JSON.stringify({ msg: "starting deploy" }),
        sequenceNumber: 0,
      };

      const created = await repo.create(log);
      expect(created).toEqual(log);

      const fetched = await repo.readById("task-1-init-deployOracle-0");
      expect(fetched).toMatchObject({
        taskId: "task-1",
        type: "init",
        key: "task-1-init-deployOracle-0",
        operation: "deployOracle",
        data: JSON.stringify({ msg: "starting deploy" }),
      });
    });

    it("reads logs by taskId ordered by timestamp", async () => {
      const base = Date.now();
      const logs: OracleLog[] = [
        {
          taskId: "task-2",
          type: "init",
          key: "task-2-init-registerTask-0",
          operation: "registerTask",
          timestamp: String(base),
          data: "init data",
          sequenceNumber: 0,
        },
        {
          taskId: "task-2",
          type: "exec",
          key: "task-2-exec-registerTask-1",
          operation: "registerTask",
          timestamp: String(base + 1000),
          data: "exec data",
          sequenceNumber: 1,
        },
        {
          taskId: "task-2",
          type: "done",
          key: "task-2-done-registerTask-2",
          operation: "registerTask",
          timestamp: String(base + 2000),
          data: "done data",
          sequenceNumber: 2,
        },
      ];

      for (const log of logs) {
        await repo.create(log);
      }

      const fetched = await repo.readByTaskId("task-2");
      expect(fetched).toHaveLength(3);
      expect(fetched[0].type).toBe("init");
      expect(fetched[1].type).toBe("exec");
      expect(fetched[2].type).toBe("done");
    });

    it("returns undefined for non-existent key", async () => {
      const result = await repo.readById("non-existent-key");
      expect(result).toBeUndefined();
    });

    it("returns empty array for non-existent taskId", async () => {
      const result = await repo.readByTaskId("non-existent-task");
      expect(result).toEqual([]);
    });

    it("rejects duplicate primary keys", async () => {
      const log: OracleLog = {
        taskId: "task-dup",
        type: "init",
        key: "duplicate-key",
        operation: "deployOracle",
        timestamp: Date.now().toString(),
        data: "first",
        sequenceNumber: 0,
      };

      await repo.create(log);

      await expect(repo.create({ ...log, data: "second" })).rejects.toThrow();
    });

    it("resets the database (rollback + migrate)", async () => {
      await repo.create({
        taskId: "task-reset",
        type: "init",
        key: "reset-key",
        operation: "executeTask",
        timestamp: Date.now().toString(),
        data: "before reset",
        sequenceNumber: 0,
      });

      await repo.reset();

      const result = await repo.readByTaskId("task-reset");
      expect(result).toEqual([]);
    });

    it("stores logs with optional operationId", async () => {
      const log: OracleLog = {
        taskId: "task-relay",
        type: "exec",
        key: "task-relay-exec-relayOperation-0",
        operation: "relayOperation",
        timestamp: Date.now().toString(),
        data: "relay data",
        operationId: "op-123",
        sequenceNumber: 0,
      };

      await repo.create(log);
      const fetched = await repo.readById("task-relay-exec-relayOperation-0");
      expect(fetched.operationId).toBe("op-123");
    });
  });

  describe("OraclePersistence", () => {
    it("stores an oracle log entry and generates key and timestamp", async () => {
      const entry: OracleLogEntry = {
        taskId: "persist-task-1",
        type: "init",
        operation: "deployOracle",
        data: JSON.stringify({ action: "deploying" }),
        sequenceNumber: 0,
      };

      await persistence.storeOracleLog(entry);

      const expectedKey = "persist-task-1-init-deployOracle-0";
      const fetched = await repo.readById(expectedKey);
      expect(fetched).toBeDefined();
      expect(fetched.taskId).toBe("persist-task-1");
      expect(fetched.type).toBe("init");
      expect(fetched.operation).toBe("deployOracle");
      expect(fetched.data).toBe(JSON.stringify({ action: "deploying" }));
      expect(fetched.timestamp).toBeDefined();
      expect(fetched.sequenceNumber).toBe(0);
    });

    it("stores multiple lifecycle logs (init/exec/done) for an operation", async () => {
      const types = ["init", "exec", "done"];

      for (let i = 0; i < types.length; i++) {
        await persistence.storeOracleLog({
          taskId: "lifecycle-task",
          type: types[i],
          operation: "registerTask",
          data: `${types[i]} data`,
          sequenceNumber: i,
        });
      }

      const logs = await repo.readByTaskId("lifecycle-task");
      expect(logs).toHaveLength(3);
      expect(logs.map((l) => l.type)).toEqual(["init", "exec", "done"]);
    });

    it("stores fail log entry", async () => {
      await persistence.storeOracleLog({
        taskId: "fail-task",
        type: "fail",
        operation: "executeTask",
        data: JSON.stringify({ error: "execution failed" }),
        sequenceNumber: 1,
      });

      const logs = await repo.readByTaskId("fail-task");
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe("fail");
      expect(JSON.parse(logs[0].data)).toHaveProperty("error");
    });

    it("stores log entry with operationId for relay operations", async () => {
      await persistence.storeOracleLog({
        taskId: "relay-task",
        type: "exec",
        operation: "relayOperation",
        data: "relay payload",
        operationId: "op-456",
        sequenceNumber: 3,
      });

      const fetched = await repo.readById("relay-task-exec-relayOperation-3");
      expect(fetched.operationId).toBe("op-456");
    });

    it("skips storing when data is undefined", async () => {
      await persistence.storeOracleLog({
        taskId: "no-data-task",
        type: "init",
        operation: "deployOracle",
        data: undefined as unknown as string,
        sequenceNumber: 0,
      });

      const logs = await repo.readByTaskId("no-data-task");
      expect(logs).toEqual([]);
    });

    it("exposes the oracle log repository", () => {
      const exposedRepo = persistence.getOracleLogRepository();
      expect(exposedRepo).toBe(repo);
    });

    it("stores a very large data payload without throwing (regression)", async () => {
      const huge = "x".repeat(256 * 1024); // 256 KB

      const entry: OracleLogEntry = {
        taskId: "oversized-task",
        type: "fail",
        operation: "deploy-oracle",
        data: huge,
        sequenceNumber: 0,
      };

      await expect(persistence.storeOracleLog(entry)).resolves.toBeUndefined();

      const logs = await repo.readByTaskId("oversized-task");
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toBe(huge);
    });

    it("stores a very large taskId without throwing", async () => {
      const hugeTaskId = "t".repeat(4096);

      await expect(
        persistence.storeOracleLog({
          taskId: hugeTaskId,
          type: "init",
          operation: "deploy-oracle",
          data: "ok",
          sequenceNumber: 0,
        }),
      ).resolves.toBeUndefined();

      const logs = await repo.readByTaskId(hugeTaskId);
      expect(logs).toHaveLength(1);
      expect(logs[0].taskId).toBe(hugeTaskId);
    });

    it("serializes non-string data into JSON without throwing", async () => {
      const payload = { nested: { deep: { value: 42 } }, list: [1, 2, 3] };

      await persistence.storeOracleLog({
        taskId: "json-task",
        type: "exec",
        operation: "execute-task",
        data: payload as unknown as string,
        sequenceNumber: 0,
      });

      const logs = await repo.readByTaskId("json-task");
      expect(logs).toHaveLength(1);
      expect(() => JSON.parse(logs[0].data)).not.toThrow();
      expect(JSON.parse(logs[0].data)).toEqual(payload);
    });

    it("does not throw when serializing values with cycles", async () => {
      const cyclic: Record<string, unknown> = { name: "cycle" };
      cyclic.self = cyclic;

      await expect(
        persistence.storeOracleLog({
          taskId: "cycle-task",
          type: "exec",
          operation: "execute-task",
          data: cyclic as unknown as string,
          sequenceNumber: 0,
        }),
      ).resolves.toBeUndefined();

      const logs = await repo.readByTaskId("cycle-task");
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toContain("[Circular]");
    });
  });

  describe("OracleManager with persistence", () => {
    let managerRepo: KnexOracleLogRepository;
    let managerPersistence: OraclePersistence;
    let oracleManager: OracleManager;

    beforeAll(async () => {
      managerRepo = new KnexOracleLogRepository(sqliteConfig);
      await managerRepo.database.migrate.latest();

      managerPersistence = new OraclePersistence({
        oracleLogRepository: managerRepo,
        logLevel: "DEBUG",
        monitorService,
      });

      oracleManager = new OracleManager({
        logLevel: "DEBUG",
        bungee: undefined,
        initialTasks: [],
        monitorService,
        dbLogger: managerPersistence,
      });
    });

    afterAll(async () => {
      await managerRepo.destroy();
    });

    afterEach(async () => {
      await managerRepo.getOracleLogsTable().del();
    });

    it("persists init, exec and fail logs when executeTask is called", async () => {
      const task: OracleTask = {
        taskID: "mgr-test-1",
        type: OracleTaskTypeEnum.Read,
        srcContract: {
          contractAddress: "0x0",
          contractAbi: [],
          contractName: "Test",
        },
        dstContract: {
          contractAddress: "0x0",
          contractAbi: [],
          contractName: "Test",
        },
        timestamp: Date.now(),
        operations: [],
        status: OracleTaskStatusEnum.Active,
        mode: OracleTaskModeEnum.Immediate,
      };

      await oracleManager.executeTask(task);

      // logAndPersist is fire-and-forget; give writes time to flush
      await new Promise((resolve) => setTimeout(resolve, 200));

      const logs = await managerRepo.readByTaskId("mgr-test-1");

      // executeTask produces init → exec → fail (processTask fails without deployed oracles)
      expect(logs.length).toBeGreaterThanOrEqual(3);

      const ops = logs.map((l) => l.operation);
      expect(ops).toContain("init");
      expect(ops).toContain("exec");
      expect(ops).toContain("fail");

      const types = logs.map((l) => l.type);
      expect(types).toContain("execute-task");

      for (const log of logs) {
        expect(log.taskId).toBe("mgr-test-1");
        expect(log.timestamp).toBeDefined();
      }
    });
  });
});

describe("SQLite oracle log database isolation", () => {
  it("two repos with the same instanceId share the same file database", async () => {
    // Two KnexOracleLogRepository instances backed by the same file path
    // behave as connections to the same database.
    const instanceId = "same-db-test";
    const repoA = new KnexOracleLogRepository(
      createOracleLogKnexConfig(instanceId),
    );
    await repoA.database.migrate.latest();

    // Open a second handle to the same file (simulates pool connection #2).
    const repoB = new KnexOracleLogRepository(
      createOracleLogKnexConfig(instanceId),
    );

    // Insert via repoA, read back via repoB.
    const log: OracleLog = {
      key: "shared-key-1",
      taskId: "shared-task",
      type: "init",
      operation: "deploy-oracle",
      data: "hello",
      timestamp: Date.now().toString(),
      sequenceNumber: 0,
    };
    await repoA.create(log);

    const result = await repoB.readById("shared-key-1");
    expect(result).toBeDefined();
    expect(result.data).toBe("hello");

    await repoA.destroy();
    await repoB.destroy();
  });

  it("two file-based databases with different instanceIds are isolated", async () => {
    const repoAlpha = new KnexOracleLogRepository(
      createOracleLogKnexConfig("alpha"),
    );
    const repoBeta = new KnexOracleLogRepository(
      createOracleLogKnexConfig("beta"),
    );

    await repoAlpha.database.migrate.latest();
    await repoBeta.database.migrate.latest();

    const logAlpha: OracleLog = {
      key: "alpha-key-1",
      taskId: "alpha-task",
      type: "init",
      operation: "deploy-oracle",
      data: "alpha-data",
      timestamp: Date.now().toString(),
      sequenceNumber: 0,
    };
    await repoAlpha.create(logAlpha);

    // beta database must not contain the row written to alpha.
    const inBeta = await repoBeta.readByTaskId("alpha-task");
    expect(inBeta).toHaveLength(0);

    await repoAlpha.destroy();
    await repoBeta.destroy();
  });

  it("migrate.latest() then insert does not produce 'no such table' error", async () => {
    const instanceId = "migrate-then-insert";
    const repo = new KnexOracleLogRepository(
      createOracleLogKnexConfig(instanceId),
    );
    await repo.database.migrate.latest();

    const log: OracleLog = {
      key: "mti-key-1",
      taskId: "mti-task",
      type: "exec",
      operation: "execute-task",
      data: "ok",
      timestamp: Date.now().toString(),
      sequenceNumber: 0,
    };

    await expect(repo.create(log)).resolves.toBeDefined();

    const rows = await repo.readByTaskId("mti-task");
    expect(rows).toHaveLength(1);

    await repo.destroy();
  });
});
