export const knexClientConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-odap-hermes/knex/.dev.client.sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-odap-hermes/knex/migrations",
  },
  useNullAsDefault: true,
};

export const knexServerConnection = {
  client: "sqlite3",
  connection: {
    filename: "./packages/cactus-plugin-odap-hermes/knex/.dev.server.sqlite3",
  },
  migrations: {
    directory: "./packages/cactus-plugin-odap-hermes/knex/migrations",
  },
  useNullAsDefault: true,
};
