import { Knex } from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("logs", (table) => {
    table.string("sessionId").notNullable();
    table.string("type").notNullable();
    table.string("key").notNullable().primary();
    table.string("operation").notNullable();
    table.string("timestamp").notNullable();
    table.string("data").notNullable();
    table.bigInteger("sequenceNumber").notNullable();
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("logs");
}
