import { Knex } from "knex";

export function up(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.createTable("session_proofs", (table) => {
    table.string("proofId").notNullable().unique().primary();
    table.string("sessionId").notNullable().index();
    table.string("step").notNullable();
    table.text("claim").notNullable();
    table.text("signedClaim").notNullable();
    table.bigInteger("timestamp").notNullable();
  });
}

export function down(knex: Knex): Knex.SchemaBuilder {
  return knex.schema.dropTable("session_proofs");
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
  return "20260910120000_add_session_proofs_table";
}
