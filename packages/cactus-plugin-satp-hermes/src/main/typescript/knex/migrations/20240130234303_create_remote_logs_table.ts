import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("remote-logs", (table) => {
    table.string("hash").notNullable();
    table.string("signature").notNullable();
    table.string("signerPubKey").notNullable();
    table.string("key").notNullable().primary();
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("remote-logs");
}
