import type { OracleLog } from "../../core/types";
import type { IOracleLogRepository } from "./interfaces/repository";
import knex, { type Knex } from "knex";
import { knexLocalInstance } from "../knexfile";
import { createMigrationSource } from "../knex-migration-source";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 3000;

export class KnexOracleLogRepository implements IOracleLogRepository {
  readonly database: Knex;
  private created = false;

  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "default";
    const configFile = knexLocalInstance[envName] || knexLocalInstance.default;
    config = config || configFile;

    const migrationSource = createMigrationSource();
    config = {
      ...config,
      migrations: { migrationSource: migrationSource },
    } as Knex.Config;
    this.database = knex(config);
  }

  public getCreated(): boolean {
    return this.created;
  }

  getOracleLogsTable(): Knex.QueryBuilder {
    return this.database("oracle_logs");
  }

  readById(logKey: string): Promise<OracleLog> {
    return this.getOracleLogsTable().where({ key: logKey }).first();
  }

  readByTaskId(taskId: string): Promise<OracleLog[]> {
    return this.getOracleLogsTable()
      .where({ taskId })
      .orderBy("timestamp", "asc");
  }

  async create(log: OracleLog): Promise<OracleLog> {
    await this.executeWithRetry(() => this.getOracleLogsTable().insert(log));
    return log;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isSqliteBusy =
          errorMessage.includes("SQLITE_BUSY") ||
          errorMessage.includes("database is locked");

        if (!isSqliteBusy || attempt === MAX_RETRIES) throw error;

        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = Math.min(
          BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 100,
          MAX_DELAY_MS,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }

  async reset() {
    await this.database.migrate.rollback();
    await this.database.migrate.latest();
  }

  async destroy() {
    await this.database.destroy();
  }
}
