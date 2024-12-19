import path from "path";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { Knex } from "knex";

const envPath = process.env.ENV_PATH;
dotenv.config({ path: envPath });

export const knexLocalInstance: { [key: string]: Knex.Config } = {
  default: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, `.dev.local-${uuidv4()}.sqlite3`),
    },
    migrations: {
      directory: path.resolve(__dirname, "migrations"),
    },
    seeds: {
      directory: path.resolve(__dirname, "seeds"),
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
