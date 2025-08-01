// 20240821000000_seed_dev_logs.ts

import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Check if we're in the development environment
  if (process.env.NODE_ENV !== "development") {
    console.log("Skipping seed: Not in development environment");
    return;
  }

  // Function to clear table if it exists
  async function clearTableIfExists(tableName: string) {
    if (await knex.schema.hasTable(tableName)) {
      await knex(tableName).del();
      console.log(`Cleared existing entries from ${tableName}`);
    } else {
      console.log(`Table ${tableName} does not exist, skipping clear`);
    }
  }

  // Clear existing entries if tables exist
  await clearTableIfExists("logs");
  await clearTableIfExists("remote-logs");

  // Insert a single deterministic log entry
  await knex("logs").insert({
    sessionID: "test-session-001",
    type: "info",
    key: "test-log-001",
    operation: "create",
    timestamp: "2024-08-21T12:00:00Z",
    data: JSON.stringify({ message: "This is a test log entry" }),
  });
}
