import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { Knex } from "knex";

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

const config: { [key: string]: Knex.Config } = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, ".dev.remote-" + uuidv4() + ".sqlite3"),
    },
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
    },
    useNullAsDefault: true,
  },
  production: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
    },
  },
};

export default config;
