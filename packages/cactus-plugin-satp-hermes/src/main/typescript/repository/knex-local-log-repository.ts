import { LocalLog } from "../core/types";
import { ILocalLogRepository } from "./interfaces/repository";
import knex, { Knex } from "knex";

import knexFile from "../knex/knexfile";

export class KnexLocalLogRepository implements ILocalLogRepository {
  readonly database: Knex;

  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "development";
    const configFile = knexFile[envName];
    this.database = knex(config || configFile);
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

  create(log: LocalLog): any {
    return this.getLogsTable().insert(log);
  }

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
