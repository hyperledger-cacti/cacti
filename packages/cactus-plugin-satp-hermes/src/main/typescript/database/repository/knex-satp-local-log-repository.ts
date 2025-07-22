import type { SATPLocalLog } from "../../core/types";
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

  readById(logKey: string): Promise<SATPLocalLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  readLastestLog(sessionID: string): Promise<SATPLocalLog> {
    return this.getLogsTable()
      .orderBy("timestamp", "desc")
      .where({ sessionID: sessionID })
      .first();
  }

  readLogsMoreRecentThanTimestamp(timestamp: string): Promise<SATPLocalLog[]> {
    return this.getLogsTable()
      .where("timestamp", ">", timestamp)
      .whereNot("type", "like", "%proof%");
  }

  // TODO fix any type
  create(log: SATPLocalLog): any {
    return this.getLogsTable().insert(log);
  }

  // TODO fix any type
  deleteBySessionId(sessionID: string): any {
    return this.database().where({ sessionID: sessionID }).del();
  }

  readLogsNotProofs(): Promise<SATPLocalLog[]> {
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
  ): Promise<SATPLocalLog[]> {
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
