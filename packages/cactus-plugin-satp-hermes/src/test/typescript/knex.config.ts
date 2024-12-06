import { v4 as uuidv4 } from "uuid";

export const knexClientConnection = {
  client: "sqlite3",
  connection: {
    filename:
      "./packages/cactus-plugin-satp-hermes/src/knex/.dev.client-" +
      uuidv4() +
      ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexServerConnection = {
  client: "sqlite3",
  connection: {
    filename:
      "./packages/cactus-plugin-satp-hermes/src/knex/.dev.server-" +
      uuidv4() +
      ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexSourceRemoteConnection = {
  client: "sqlite3",
  connection: {
    filename:
      "./packages/cactus-plugin-satp-hermes/src/knex/.dev.source-remote-" +
      uuidv4() +
      ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexTargetRemoteConnection = {
  client: "sqlite3",
  connection: {
    filename:
      "./packages/cactus-plugin-satp-hermes/src/knex/.dev.target-remote-" +
      uuidv4() +
      ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};
