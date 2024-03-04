import { v4 as uuidv4 } from "uuid";

export const knexClientConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/src/knex/.dev.client-" + uuidv4() + ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexServerConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/src/knex/.dev.server-" + uuidv4() + ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexRemoteConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/src/knex/.dev.remote-" + uuidv4() + ".sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/src/knex/migrations",
  },
  useNullAsDefault: true,
};
