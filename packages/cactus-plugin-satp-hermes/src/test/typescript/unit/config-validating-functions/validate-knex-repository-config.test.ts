import "jest-extended";
import { validateKnexRepositoryConfig } from "../../../../main/typescript/services/validation/config-validating-functions/validate-knex-repository-config";

describe("validateKnexRepositoryConfig", () => {
  it("should pass with valid config", () => {
    const migrationsProperty = {
      client: "pg",
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    const result = validateKnexRepositoryConfig({
      configValue: migrationsProperty,
    });
    expect(result).toEqual(migrationsProperty);
  });

  it("should throw if client is missing", () => {
    const migrationsProperty = {
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'client' property: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if client is not a string", () => {
    const migrationsProperty = {
      client: 123,
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'client' property: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is missing", () => {
    const migrationsProperty = {
      client: "pg",
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Missing 'connection' property: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is null", () => {
    const migrationsProperty = {
      client: "pg",
      connection: null,
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Missing 'connection' property: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is an empty string", () => {
    const migrationsProperty = {
      client: "pg",
      connection: "",
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Missing 'connection' property: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is sqlite3, but filename is missing", () => {
    const migrationsProperty = {
      client: "sqlite3",
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.filename' for sqlite3: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is sqlite3, but filename is not a string", () => {
    const migrationsProperty = {
      client: "sqlite3",
      connection: {
        filename: 1234,
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.filename' for sqlite3: ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but host is missing", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.host': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but host is not a string", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: 123,
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.host': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but user is missing", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.user': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but user is not a string", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        user: 123,
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.user': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but password is missing", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        user: "user",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid 'connection.password': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but password is not a string", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        user: "user",
        password: true,
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid 'connection.password': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but database is missing", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.database': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if connection is mssql, but database is not a string", () => {
    const migrationsProperty = {
      client: "mssql",
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: 123,
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(
      `Invalid or missing 'connection.database': ${JSON.stringify(migrationsProperty)}`,
    );
  });

  it("should throw if is a unknow client", () => {
    const migrationsProperty = {
      client: "unknow",
      connection: {
        host: "localhost",
        user: "user",
        password: "pass",
        database: "db",
      },
    };
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: migrationsProperty,
      }),
    ).toThrowError(`Unsupported client type: unknow`);
  });
});
