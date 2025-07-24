import { Knex } from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("oracle_logs", (table) => {
    table.string("taskID").notNullable();
    table.string("type").notNullable();
    table.string("key").notNullable().primary();
    table.string("operation").notNullable();
    table.string("timestamp").notNullable();
    table.text("data").notNullable();
    table.string("oracleOperationId").notNullable();
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("oracle_logs");
}

export function getId(): Readonly<string> {
  return "20220331132128_create_logs_table";
}
