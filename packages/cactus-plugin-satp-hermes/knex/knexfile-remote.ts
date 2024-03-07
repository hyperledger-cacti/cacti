import path from "path";

// default configuration for knex
module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, ".dev-remote.sqlite3"),
    },
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
    },
    useNullAsDefault: true,
  },
};
