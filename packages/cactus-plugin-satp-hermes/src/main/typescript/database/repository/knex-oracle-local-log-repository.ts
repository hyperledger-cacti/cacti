import type { OracleLocalLog } from "../../core/types";
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

  // TODO fix any type
  create(log: OracleLocalLog): any {
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
