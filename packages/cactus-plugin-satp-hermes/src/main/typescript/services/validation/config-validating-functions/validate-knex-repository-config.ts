import { Knex } from "knex";

export function validateKnexRepositoryConfig(opts: {
  readonly configValue: unknown;
}): Knex.Config | undefined {
  if (!opts || !opts.configValue) {
    return undefined;
  }

  if (opts.configValue === null) {
    return undefined;
  }

  if (typeof opts.configValue !== "object") {
    throw new Error(
      `Configuration must be an object: ${JSON.stringify(opts.configValue)}`,
    );
  }

  const config = opts.configValue as Knex.Config;

  // Validate 'client' property
  if (!config.client || typeof config.client !== "string") {
    throw new Error(
      `Invalid or missing 'client' property: ${JSON.stringify(config)}`,
    );
  }

  // Validate 'connection' property
  if (!config.connection) {
    throw new Error(`Missing 'connection' property: ${JSON.stringify(config)}`);
  }

  if (typeof config.connection === "string") {
    // If connection is a string, ensure it's not empty
    if (config.connection.trim() === "") {
      throw new Error(
        `Connection string cannot be empty: ${JSON.stringify(config)}`,
      );
    }
  } else if (typeof config.connection === "object") {
    // Validate connection object based on client type
    const connection = config.connection as any;

    switch (config.client) {
      case "sqlite3":
        if (!connection.filename || typeof connection.filename !== "string") {
          throw new Error(
            `Invalid or missing 'connection.filename' for sqlite3: ${JSON.stringify(config)}`,
          );
        }
        break;
      case "mysql":
      case "mysql2":
      case "pg":
      case "oracledb":
      case "mssql":
        if (!connection.host || typeof connection.host !== "string") {
          throw new Error(
            `Invalid or missing 'connection.host': ${JSON.stringify(config)}`,
          );
        }
        if (!connection.user || typeof connection.user !== "string") {
          throw new Error(
            `Invalid or missing 'connection.user': ${JSON.stringify(config)}`,
          );
        }
        if (!connection.password || typeof connection.password !== "string") {
          throw new Error(
            `Invalid 'connection.password': ${JSON.stringify(config)}`,
          );
        }
        if (!connection.database || typeof connection.database !== "string") {
          throw new Error(
            `Invalid or missing 'connection.database': ${JSON.stringify(config)}`,
          );
        }
        break;
      default:
        throw new Error(`Unsupported client type: ${config.client}`);
    }
  } else {
    // Connection is neither a string nor an object
    throw new Error(`Invalid 'connection' property: ${JSON.stringify(config)}`);
  }

  // Validate 'migrations' property if present
  if (config.migrations !== undefined) {
    if (typeof config.migrations !== "object" || config.migrations === null) {
      throw new Error(
        `Invalid 'migrations' property: ${JSON.stringify(config)}`,
      );
    } else {
      if (
        config.migrations.directory !== undefined &&
        typeof config.migrations.directory !== "string"
      ) {
        throw new Error(
          `Invalid 'migrations.directory' property: ${JSON.stringify(config)}`,
        );
      }
      if (
        config.migrations.tableName !== undefined &&
        typeof config.migrations.tableName !== "string"
      ) {
        throw new Error(
          `Invalid 'migrations.tableName' property: ${JSON.stringify(config)}`,
        );
      }
    }
  }

  // Validate 'useNullAsDefault' property if present
  if (
    config.useNullAsDefault !== undefined &&
    typeof config.useNullAsDefault !== "boolean"
  ) {
    throw new Error(
      `Invalid 'useNullAsDefault' property; it must be a boolean: ${JSON.stringify(config)}`,
    );
  }

  // Additional validation can be added here as needed

  return config;
}
