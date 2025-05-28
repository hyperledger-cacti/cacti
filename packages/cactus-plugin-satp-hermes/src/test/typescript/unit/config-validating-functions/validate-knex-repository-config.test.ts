import "jest-extended";
import { validateKnexRepositoryConfig } from "../../../../main/typescript/services/validation/config-validating-functions/validate-knex-repository-config";

describe("validateKnexRepositoryConfig", () => {
  it("should pass with valid config", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "pg",
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).not.toThrow();
  });

  it("should throw if client is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if client is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: 123,
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "pg",
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is null", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "pg",
          connection: null,
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is an empty string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "pg",
          connection: "",
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is sqlite3, but filename is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "sqlite3",
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is sqlite3, but filename is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "sqlite3",
          connection: {
            filename: 1234,
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but host is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but host is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: 123,
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but user is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but user is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            user: 123,
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but password is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            user: "user",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but password is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but database is missing", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            user: "user",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if connection is mssql, but database is not a string", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "mssql",
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: 123,
          },
        },
      }),
    ).toThrow();
  });

  it("should throw if is a unknow client", () => {
    expect(() =>
      validateKnexRepositoryConfig({
        configValue: {
          client: "unknow",
          connection: {
            host: "localhost",
            user: "user",
            password: "pass",
            database: "db",
          },
        },
      }),
    ).toThrow();
  });
});
