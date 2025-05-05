import { Knex } from "knex";
import { Err, Ok, Result } from "ts-results";

import * as create_logs_table from "./migrations/20220331132128_create_logs_table";
import * as create_remote_logs_table from "./migrations/20240130234303_create_remote_logs_table";

export interface IKnexMigration {
  up(knex: Readonly<Knex>): Promise<void>;
  down(knex: Readonly<Knex>): Promise<void>;
  getId(): Readonly<string>;
}

export interface IKnexMigrationSource<T> {
  getMigrations(): Promise<string[]>;

  getMigrationName(migrationName: Readonly<string>): string;

  getMigration(migrationName: string): Promise<T>;
}

function registerMigration(
  migrations: Map<string, IKnexMigration>,
  aMigration: IKnexMigration,
): Result<void, Error> {
  const id = aMigration.getId();
  if (migrations.has(id)) {
    return Err(new Error("Duplicate migration ID detected: " + id));
  } else {
    migrations.set(id, aMigration);
  }
  return Ok.EMPTY;
}

export function createMigrationSource(): IKnexMigrationSource<IKnexMigration> {
  const migrations: Map<string, IKnexMigration> = new Map();

  registerMigration(migrations, create_logs_table);
  registerMigration(migrations, create_remote_logs_table);

  const kms: IKnexMigrationSource<IKnexMigration> = {
    getMigrations: async (): Promise<string[]> => {
      return Array.from(migrations.keys());
    },
    getMigrationName: (migrationName: Readonly<string>): Readonly<string> => {
      return migrationName;
    },
    getMigration: async function (
      migrationName: string,
    ): Promise<IKnexMigration> {
      const aMigration = migrations.get(migrationName);
      if (!aMigration) {
        throw new Error("No such migration present: " + migrationName);
      }
      return aMigration;
    },
  };
  return kms;
}
