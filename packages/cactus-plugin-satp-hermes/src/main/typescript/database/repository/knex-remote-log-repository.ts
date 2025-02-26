import type { IRemoteLogRepository } from "./interfaces/repository";
import type { RemoteLog } from "../../core/types";
import knex, { type Knex } from "knex";

import { knexRemoteInstance } from "../../database/knexfile-remote";

export class KnexRemoteLogRepository implements IRemoteLogRepository {
  readonly database: Knex;

  // for now we will ignore the config because it needs to be static
  // so that both gateways can have access to the same database
  // simulating a remote log storage
  public constructor(config: Knex.Config | undefined) {
    const envName = process.env.ENVIRONMENT || "development";
    const configFile = knexRemoteInstance[envName];
    this.database = knex(config || configFile);
  }

  getLogsTable(): Knex.QueryBuilder {
    return this.database("remote-logs");
  }

  readById(logKey: string): Promise<RemoteLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  // TODO fix any type
  create(log: RemoteLog): any {
    return this.getLogsTable().insert(log);
  }

  async reset() {
    await this.database.migrate.rollback();
    await this.database.migrate.latest();
  }

  async destroy() {
    await this.database.destroy();
  }
}
