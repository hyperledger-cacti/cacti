export const knexClientConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/knex/.dev.client.sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexServerConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/knex/.dev.server.sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexRemoteConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-satp-hermes/knex/.dev.remote.sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-satp-hermes/knex/migrations",
  },
  useNullAsDefault: true,
};
