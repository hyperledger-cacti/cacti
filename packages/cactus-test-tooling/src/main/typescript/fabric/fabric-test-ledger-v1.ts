import path from "path";

import Docker, { Container, ContainerInfo } from "dockerode";
import { Config as SshConfig } from "node-ssh";
import Client from "fabric-client";
import axios from "axios";
import Joi from "joi";
import { EventEmitter } from "events";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";
import { ISigningIdentity } from "./i-fabric-signing-identity";
import {
  Logger,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";

/*
 * Contains options for Fabric container
 */
export interface IFabricTestLedgerV1ConstructorOptions {
  imageVersion?: string;
  imageName?: string;
  opsApiHttpPort?: number;
  logLevel?: LogLevelDesc;
}

/*
 * Provides default options for Fabric container
 */
const DEFAULT_OPTS = Object.freeze({
  imageVersion: "latest",
  imageName: "hyperledger/cactus-fabric-all-in-one",
  opsApiHttpPort: 9443,
});
export const FABRIC_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULT_OPTS;

/*
 * Provides validations for the Fabric container's options
 */
const OPTS_JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string().min(1).required(),
  opsApiHttpPort: Joi.number().integer().min(1024).max(65535).required(),
});

export const FABRIC_TEST_LEDGER_OPTIONS_JOI_SCHEMA = OPTS_JOI_SCHEMA;

export class FabricTestLedgerV1 implements ITestLedger {
  public readonly log: Logger;
  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly opsApiHttpPort: number;

  private container: Container | undefined;
  private containerId: string | undefined;

  constructor(public readonly options: IFabricTestLedgerV1ConstructorOptions) {
    const fnTag = "FabricTestLedgerV1#constructor()";
    if (!options) {
      throw new TypeError(`${fnTag} options was falsy.`);
    }
    this.imageVersion = options.imageVersion || DEFAULT_OPTS.imageVersion;
    this.imageName = options.imageName || DEFAULT_OPTS.imageName;
    this.opsApiHttpPort = options.opsApiHttpPort || DEFAULT_OPTS.opsApiHttpPort;

    this.validateConstructorOptions();
    this.log = LoggerProvider.getOrCreate({
      label: "fabric-test-ledger-v1",
      level: options.logLevel || "INFO",
    });
  }

  public getContainer(): Container {
    const fnTag = "FabricTestLedgerV1#getContainer()";
    if (!this.container) {
      throw new Error(`${fnTag} container not yet started by this instance.`);
    } else {
      return this.container;
    }
  }

  public getContainerImageName(): string {
    return `${this.imageName}:${this.imageVersion}`;
  }

  public async getOpsApiHttpHost(): Promise<string> {
    const ipAddress: string = "127.0.0.1";
    const hostPort: number = await this.getOpsApiPublicPort();
    return `http://${ipAddress}:${hostPort}/version`;
  }

  public async getAdminFabricClient(): Promise<Client> {
    const adminSigningIdentity = await this.getAdminSigningIdentity();
    const { privateKeyPem, certificate, mspId } = adminSigningIdentity;

    const connectionProfile = await this.getConnectionProfile();

    const client: Client = Client.loadFromConfig(connectionProfile);
    client.setAdminSigningIdentity(privateKeyPem, certificate, mspId);
    return client;
  }

  /**
   *
   * @see https://hyperledger-fabric.readthedocs.io/en/release-1.4/developapps/connectionprofile.html#scenario
   * @see https://hyperledger-fabric.readthedocs.io/en/release-1.4/developapps/connectionprofile.html#sample
   */
  public async getConnectionProfile(): Promise<any> {
    const containerInfo = await this.getContainerInfo();
    const peerGrpcPort = await Containers.getPublicPort(7051, containerInfo);
    const ordererGrpcPort = await Containers.getPublicPort(7050, containerInfo);

    return {
      name: "org.hyperledger.cactus.sample.fabric-all-in-one",
      version: "1.0",
      "x-type": "hlfv1",
      description:
        "Connection profile for the Cactus Fabric All-In-One " +
        " test docker container image. Do NOT use in production.",

      channels: {
        mychannel: {
          orderers: ["orderer0"],
          peers: {
            peer0: {},
          },
        },
      },

      organizations: {
        Org1: {
          mspid: "Org1MSP",
          peers: ["peer0"],
        },
        OrdererOrg: {
          mspid: "OrdererMSP",
        },
      },

      orderers: {
        orderer0: {
          url: `grpc://localhost:${ordererGrpcPort}`,
        },
      },

      peers: {
        peer0: {
          url: `grpc://localhost:${peerGrpcPort}`,
        },
      },
    };
  }

  public async getAdminSigningIdentity(): Promise<ISigningIdentity> {
    const container = this.getContainer();

    const adminMspDir =
      "/etc/hyperledger/fabric/crypto-config/peerOrganizations/org1.cactus.stream/users/Admin@org1.cactus.stream/msp/";
    const keyStorePath = `${adminMspDir}keystore/`;

    const fileList = await Containers.ls(container, "/");
    this.log.debug("FILE LIST: %o", fileList);

    const [privateKeyFile] = await Containers.ls(container, keyStorePath);
    const privateKeyPath = path.join(keyStorePath, privateKeyFile);

    const privateKeyPem = await Containers.pullFile(container, privateKeyPath);

    const certPath = `${adminMspDir}signcerts/Admin\@org1.cactus.stream-cert.pem`;
    const certificate = await Containers.pullFile(container, certPath);

    const mspId = "Org1MSP";

    return {
      privateKeyPem,
      certificate,
      mspId,
    };
  }

  public async getSshConfig(): Promise<SshConfig> {
    const fnTag = "FabricTestLedger#getSshConnectionOptions()";
    if (!this.container) {
      throw new Error(`${fnTag} - invalid state no container instance set`);
    }
    const filePath = "/etc/hyperledger/cactus/fabric-aio-image.key";
    const privateKey = await Containers.pullFile(this.container, filePath);
    const containerInfo = await this.getContainerInfo();
    const port = await Containers.getPublicPort(22, containerInfo);
    const sshConfig: SshConfig = {
      host: "localhost",
      privateKey,
      username: "root",
      port,
    };
    return sshConfig;
  }

  public async start(omitPull: boolean = false): Promise<Container> {
    const containerNameAndTag = this.getContainerImageName();

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (!omitPull) {
      await Containers.pullImage(containerNameAndTag);
    }

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        containerNameAndTag,
        [],
        [],
        {
          Env: [
            // `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${networkMode}`,
            "FABRIC_LOGGING_SPEC=DEBUG",
            "CORE_PEER_ADDRESS=7051",
            "CORE_VM_DOCKER_ATTACHSTDOUT=true",
            "CORE_CHAINCODE_LOGGING_SHIM=debug",
            "CORE_CHAINCODE_LOGGING_LEVEL=debug",
          ],
          PortBindings: {
            "22/tcp": [{ HostPort: "30022" }],
            "7050/tcp": [{ HostPort: "7050" }],
            "7051/tcp": [{ HostPort: "7051" }],
            "7052/tcp": [{ HostPort: "7052" }],
            [`${this.opsApiHttpPort}/tcp`]: [
              { HostPort: `${this.opsApiHttpPort}` },
            ],
          },
          ExposedPorts: {
            "22/tcp": {}, // OpenSSH Server - TCP
            [`${this.opsApiHttpPort}/tcp`]: {}, // Fabric Peer GRPC - HTTP
            "7050/tcp": {}, // Orderer GRPC - HTTP
            "7051/tcp": {}, // Peer additional - HTTP
            "7052/tcp": {}, // Peer Chaincode - HTTP
            "7053/tcp": {}, // Peer additional - HTTP
            "7054/tcp": {}, // Fabric CA - HTTP
            "9001/tcp": {}, // supervisord - HTTP
          },
          // This is a workaround needed for macOS which has issues with routing
          // to docker container's IP addresses directly...
          // https://stackoverflow.com/a/39217691
          // PublishAllPorts: true,

          // needed for Docker-in-Docker support
          Privileged: true,

          // This is the fallback solution in case DinD does not work out
          // The reason why this is less desirable compared to DinD is that
          // it breaks the design principle of the AIO containers that they
          // must be self contained and not depend on the host's file-system.
          Binds: ["/var/run/:/host/var/run/"],
        },
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        }
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;
        try {
          await this.waitForHealthCheck();
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs: number = 120000): Promise<void> {
    const fnTag = "FabricTestLedgerV1#waitForHealthCheck()";
    const httpUrl = await this.getOpsApiHttpHost();
    const startedAt = Date.now();
    let reachable: boolean = false;
    do {
      try {
        const res = await axios.get(httpUrl);
        reachable = res.status > 199 && res.status < 300;
      } catch (ex) {
        reachable = false;
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex.stack}`);
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 100));
    } while (!reachable);
  }

  public stop(): Promise<any> {
    return Containers.stop(this.container as Container);
  }

  public async destroy(): Promise<any> {
    const fnTag = "FabricTestLedgerV1#destroy()";
    if (this.container) {
      return this.container.remove();
    } else {
      throw new Error(`${fnTag} Containernot found, nothing to destroy.`);
    }
  }

  protected async getContainerInfo(): Promise<ContainerInfo> {
    const fnTag = "FabricTestLedgerV1#getContainerInfo()";
    const docker = new Docker();
    const image = this.getContainerImageName();
    const containerInfos = await docker.listContainers({});

    let aContainerInfo;
    if (this.containerId !== undefined) {
      aContainerInfo = containerInfos.find((ci) => ci.Id === this.containerId);
    }

    if (aContainerInfo) {
      return aContainerInfo;
    } else {
      throw new Error(`${fnTag} no image "${image}"`);
    }
  }

  public async getOpsApiPublicPort(): Promise<number> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getPublicPort(this.opsApiHttpPort, containerInfo);
  }

  public async getContainerIpAddress(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getContainerInternalIp(containerInfo);
  }

  private validateConstructorOptions(): void {
    const fnTag = "FabricTestLedgerV1#validateConstructorOptions()";
    const result = Joi.validate<IFabricTestLedgerV1ConstructorOptions>(
      {
        imageVersion: this.imageVersion,
        imageName: this.imageName,
        opsApiHttpPort: this.opsApiHttpPort,
      },
      OPTS_JOI_SCHEMA
    );

    if (result.error) {
      throw new Error(`${fnTag} ${result.error.annotate()}`);
    }
  }
}
