import Docker, { Container, ContainerInfo } from "dockerode";
import { Containers } from "@hyperledger/cactus-test-tooling";
import { EventEmitter } from "events";

export interface MonitorSystemConfig {
  network?: string;
  grafanaPort?: number;
  httpPort?: number;
  grpcPort?: number;
  exportInterval?: number;
}

export async function createMonitorSystem(
  config: MonitorSystemConfig,
): Promise<Container> {
  const {
    network = "CDBC_Network",
    grafanaPort = 3000,
    httpPort = 4318,
    grpcPort = 4317,
    exportInterval = 1000,
  } = config;

  const fnTag = "createMonitorSystem()";
  const docker = new Docker();

  const imageFqn = "grafana/otel-lgtm:latest";

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
    PortBindings: {
      "3000/tcp": [{ HostPort: String(grafanaPort) }],
      "4317/tcp": [{ HostPort: String(grpcPort) }],
      "4318/tcp": [{ HostPort: String(httpPort) }],
    },
  };

  const healthCheck = {
    test: [
      "CMD-SHELL",
      `curl -sf http://localhost:${grafanaPort}/api/health | grep -q '"database": "ok"' || exit 1`,
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
        PortBindings: {
          "3000/tcp": [{ HostPort: String(grafanaPort) }],
          "4317/tcp": [{ HostPort: String(grpcPort) }],
          "4318/tcp": [{ HostPort: String(httpPort) }],
        },
        ExposedPorts: {
          [`${grafanaPort}/tcp`]: {},
          [`${grpcPort}/tcp`]: {},
          [`${httpPort}/tcp`]: {},
        },
        HostConfig: hostConfig,
        Healthcheck: healthCheck,
        Env: [
          `OTEL_METRIC_EXPORT_INTERVAL=${exportInterval}`,
          "OTEL_EXPORTER_OTLP_METRICS_DEFAULT_HISTOGRAM_AGGREGATION=explicit_bucket_histogram",
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

  return await container;
}
