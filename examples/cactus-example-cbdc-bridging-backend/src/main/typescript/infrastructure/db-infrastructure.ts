import knex, { Knex } from "knex";
import Docker, { Container, ContainerInfo } from "dockerode";
import { Containers } from "@hyperledger-cacti/cactus-test-tooling";
import { EventEmitter } from "events";
import { createMigrationSource } from "./knex/knex-migration-source";

export interface PGDatabaseConfig {
  toUseInDocker?: boolean;
  network?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresDB?: string;
}

export async function createPGDatabase(
  config: PGDatabaseConfig,
): Promise<{ config: Knex.Config; container: Container }> {
  const {
    network,
    postgresUser = "postgres",
    postgresPassword = "password",
    postgresDB = "my_database",
  } = config;

  const fnTag = "createPGDatabase()";
  const docker = new Docker();

  const imageFqn = "postgres:17.2";

  console.debug(`Pulling container image ${imageFqn} ...`);
  await Containers.pullImage(imageFqn, {}, "DEBUG");
  console.debug(`Pulled ${imageFqn} OK. Starting container...`);

  console.debug(`Starting container with image: ${imageFqn}...`);

  if (network) {
    const networks = await docker.listNetworks();
    const networkExists = networks.some((n) => n.Name === network);
    if (!networkExists) {
      await docker.createNetwork({
        Name: network,
        Driver: "bridge",
      });
    }
  }

  const hostConfig: Docker.HostConfig = {
    PublishAllPorts: false,
    Binds: [],
    NetworkMode: network,
  };

  const healthCheck = {
    test: [
      "CMD-SHELL",
      `sh -c 'pg_isready -h localhost -d ${postgresDB} -U ${postgresUser} -p 5432'`,
    ],
    interval: 1000000,
    timeout: 60000000,
    retries: 30,
    startPeriod: 1000000,
  };

  const container = new Promise<Container>((resolve, reject) => {
    const eventEmitter: EventEmitter = docker.run(
      imageFqn,
      [],
      [],
      {
        ExposedPorts: {
          ["5432/tcp"]: {},
        },
        HostConfig: hostConfig,
        Healthcheck: healthCheck,
        Env: [
          `POSTGRES_USER=${postgresUser}`,
          `POSTGRES_PASSWORD=${postgresPassword}`,
          `POSTGRES_DB=${postgresDB}`,
        ],
      },
      {},
      (err: unknown) => {
        if (err) {
          reject(err);
        }
      },
    );

    eventEmitter.once("start", async (container: Container) => {
      console.debug(`Started container OK. Waiting for healthcheck...`);

      try {
        const startedAt = Date.now();
        let isHealthy = false;
        do {
          if (Date.now() >= startedAt + 60000) {
            throw new Error(`${fnTag} timed out (${60000}ms)`);
          }

          const containerInfos = await docker.listContainers({});
          const containerInfo = containerInfos.find(
            (ci) => ci.Id === container.id,
          );
          let status;
          try {
            status = ((await containerInfo) as ContainerInfo).Status;
          } catch {
            continue;
          }

          isHealthy = status.endsWith("(healthy)");
          if (!isHealthy) {
            await new Promise((resolve2) => setTimeout(resolve2, 1000));
          }
        } while (!isHealthy);
        console.debug(`Healthcheck passing OK.`);
        resolve(container);
      } catch (ex) {
        reject(ex);
      }
    });
  });

  const containerData = await docker
    .getContainer((await container).id)
    .inspect();

  return {
    config: {
      client: "pg",
      connection: {
        host: containerData.NetworkSettings.Networks[network || "bridge"]
          .IPAddress,
        user: postgresUser,
        password: postgresPassword,
        database: postgresDB,
        port: 5432,
        ssl: false,
      },
      migrations: {
        migrationSource: await createMigrationSource(),
      },
    } as Knex.Config,
    container: await container,
  };
}

export async function setupDBTable(config: Knex.Config): Promise<void> {
  const knexInstanceClient = knex(config);
  await knexInstanceClient.migrate.latest();
}
