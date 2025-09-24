import { IRemoteLogRepository } from "./interfaces/repository";
import { IRemoteLog } from "../plugin-satp-gateway";
import knex, { Knex } from "knex";
import * as knexfileRemoteConfig from "../../../knex/knexfile-remote";

export class KnexRemoteLogRepository implements IRemoteLogRepository {
  readonly database: Knex;

  // for now we will ignore the config because it needs to be static
  // so that both gateways can have access to the same database
  // simulating a remote log storage
  public constructor(config: Knex.Config | undefined) {
    const configFile = (knexfileRemoteConfig as Record<string, Knex.Config>)[
      process.env.ENVIRONMENT || "development"
    ];

    this.database = knex(config || configFile);
  }

  getLogsTable(): Knex.QueryBuilder {
    return this.database("remote-logs");
  }

  readById(logKey: string): Promise<IRemoteLog> {
    return this.getLogsTable().where({ key: logKey }).first();
  }

  create(log: IRemoteLog): any {
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
