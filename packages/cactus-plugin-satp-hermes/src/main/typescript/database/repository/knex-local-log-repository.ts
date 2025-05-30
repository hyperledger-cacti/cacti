import type { LocalLog } from "../../core/types";
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
    return this.database("logs");
  }

  readById(logKey: string): Promise<LocalLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  readLastestLog(sessionID: string): Promise<LocalLog> {
    return this.getLogsTable()
      .orderBy("timestamp", "desc")
      .where({ sessionID: sessionID })
      .first();
  }

  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<LocalLog[]> {
    return this.getLogsTable()
      .where("timestamp", ">", timestamp)
      .whereNot("type", "like", "%proof%");
  }

  // TODO fix any type
  create(log: LocalLog): any {
    return this.getLogsTable().insert(log);
  }

  // TODO fix any type
  deleteBySessionId(sessionID: string): any {
    return this.database().where({ sessionID: sessionID }).del();
  }

  readLogsNotProofs(): Promise<LocalLog[]> {
    return this.getLogsTable()
      .select(
        this.database.raw(
          "sessionID, key, data, type, operation, MAX(timestamp) as timestamp",
        ),
      )
      .whereNot({ type: "proof" })
      .groupBy("sessionID");
  }

  fetchLogsFromSequence(
    sessionId: string,
    sequenceNumber: number,
  ): Promise<LocalLog[]> {
    return this.getLogsTable()
      .where("sessionId", sessionId)
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
