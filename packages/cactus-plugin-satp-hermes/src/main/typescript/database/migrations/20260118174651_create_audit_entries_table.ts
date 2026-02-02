import { Knex } from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("audit_entries", (table) => {
    table.string("auditEntryId").notNullable().unique().primary();
    table.string("session");
    table.string("timestamp").notNullable();
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("audit_entries");
}

/**
 * Get the unique migration identifier.
 *
 * Returns the timestamp-based migration ID used for tracking
 * migration execution order and preventing duplicate applications.
 *
 * @returns Migration identifier string
 * @since 0.0.3-beta
 */
export function getId(): Readonly<string> {
  return "20260118174651_create_audit_entries_table";
}
