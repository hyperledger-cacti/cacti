import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import knex, { Knex } from "knex";

export interface IMonitorEntity {
  id: string;
  eventType: "log" | "metric" | "trace";
  timestamp: number;
  payload: unknown;
}

export interface IMonitorRepository {
  // Create or store an event
  create(entity: IMonitorEntity): Promise<IMonitorEntity>;
  // Read an event by ID
  readById(id: string): Promise<IMonitorEntity | undefined>;
  // Remove table or DB connections
  destroy(): Promise<void>;
  // Reset or migrate the storage
  reset(): Promise<void>;
}

export class KnexMonitorRepository implements IMonitorRepository {
  public readonly label = "KnexMonitorRepository";
  public readonly logger: Logger;
  public readonly database: Knex;
  private created = false;

  public constructor(config?: Knex.Config) {
    this.logger = LoggerProvider.getOrCreate({
      level: "INFO",
      label: this.label,
    });
    // Adjust your knex configuration as needed
    const defaultConfig: Knex.Config = {
      client: "sqlite3",
      connection: {
        filename: ":monitor:",
      },
      useNullAsDefault: true,
    };
    this.database = knex(config ?? defaultConfig);
  }

  public async create(entity: IMonitorEntity): Promise<IMonitorEntity> {
    await this.ensureSchema();
    await this.database("monitor_events").insert(entity);
    return entity;
  }

  public async readById(id: string): Promise<IMonitorEntity | undefined> {
    await this.ensureSchema();
    return this.database("monitor_events").where({ id }).first();
  }

  public async destroy(): Promise<void> {
    await this.database.destroy();
  }

  public async reset(): Promise<void> {
    await this.database.migrate.rollback({}, true);
    await this.database.migrate.latest();
  }

  private async ensureSchema(): Promise<void> {
    if (!this.created) {
      // Minimal schema. You can expand on columns and migrations as desired.
      await this.database.schema.hasTable("monitor_events").then(async (exists) => {
        if (!exists) {
          await this.database.schema.createTable("monitor_events", (table) => {
            table.string("id").primary();
            table.string("eventType");
            table.bigInteger("timestamp");
            table.json("payload");
          });
        }
      });
      this.created = true;
    }
  }
}
