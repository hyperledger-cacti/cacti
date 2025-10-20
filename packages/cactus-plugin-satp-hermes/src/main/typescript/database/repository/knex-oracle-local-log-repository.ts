import type { OracleLocalLog, SATPLocalLog } from "../../core/types";
import type { ILocalLogRepository } from "./interfaces/repository";
import knex, { type Knex } from "knex";
import { knexLocalInstance } from "../knexfile";
import { createMigrationSource } from "../knex-migration-source";

export class KnexLocalLogRepository implements ILocalLogRepository {
  readonly database: Knex;
  private created = false;

  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "development";
    const configFile = knexLocalInstance[envName];

    config = config || configFile;

    const migrationSource = createMigrationSource();

    config = {
      ...config,
      migrations: {
        migrationSource: migrationSource,
      },
    } as Knex.Config;
    this.database = knex(config);
  }

  public getCreated(): boolean {
    return this.created;
  }

  getLogsTable(): Knex.QueryBuilder {
    return this.database("oracle_logs");
  }

  readById(logKey: string): Promise<OracleLocalLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  readLastestLog(sessionID: string): Promise<OracleLocalLog> {
    return this.getLogsTable()
      .orderBy("timestamp", "desc")
      .where({ sessionID: sessionID })
      .first();
  }

  readLogsMoreRecentThanTimestamp(
    timestamp: string,
  ): Promise<OracleLocalLog[]> {
    return this.getLogsTable()
      .where("timestamp", ">", timestamp)
      .whereNot("type", "like", "%proof%");
  }

  // TODO fix any type
  create(log: OracleLocalLog): any {
    return this.getLogsTable().insert(log);
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    return this.getLogsTable().where("key", "like", `${sessionId}%`).del();
  }

  readLogsNotProofs(): Promise<SATPLocalLog[]> {
    return this.getLogsTable()
      .select(
        this.database.raw(
          "taskID, key, data, type, operation, oracleOperationId, MAX(timestamp) as timestamp",
        ),
      )
      .whereNot({ type: "proof" })
      .groupBy("taskID");
  }

  fetchLogsFromSequence(
    sessionId: string,
    sequenceNumber: number,
  ): Promise<OracleLocalLog[]> {
    return this.getLogsTable()
      .where("taskID", sessionId)
      .andWhere("sequenceNumber", ">", sequenceNumber);
  }

  async reset() {
    await this.database.migrate.rollback();
    await this.database.migrate.latest();
  }

  async destroy() {
    await this.database.destroy();
  }
}
