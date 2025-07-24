import { Knex } from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("logs", (table) => {
    table.string("sessionId").notNullable();
    table.string("type").notNullable();
    table.string("key").notNullable().primary();
    table.string("operation").notNullable();
    table.string("timestamp").notNullable();
    table.text("data").notNullable();
    table.bigInteger("sequenceNumber").notNullable();
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("logs");
}

export function getId(): Readonly<string> {
  return "20220331132128_create_logs_table";
}
