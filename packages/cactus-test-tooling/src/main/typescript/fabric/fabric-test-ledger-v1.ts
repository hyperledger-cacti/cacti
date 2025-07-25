import { EventEmitter } from "events";

import compareVersions from "compare-versions";
import temp from "temp";

import Docker, {
  Container,
  ContainerCreateOptions,
  ContainerInfo,
} from "dockerode";

import { Wallets, Gateway, Wallet, X509Identity } from "fabric-network";
import FabricCAServices from "fabric-ca-client";

import Joi from "joi";
import { ITestLedger } from "../i-test-ledger";
import { Containers } from "../common/containers";
import {
  Checks,
  Logger,
  LogLevelDesc,
  LoggerProvider,
  Bools,
  safeStringifyException,
} from "@hyperledger/cactus-common";
import Dockerode from "dockerode";
import {
  NodeSSH,
  Config as SshConfig,
  SSHExecCommandOptions,
  SSHExecCommandResponse,
} from "node-ssh";
import path from "path";
import fs from "fs";
import yaml from "js-yaml";
import { envMapToDocker } from "../common/env-map-to-docker";
import { RuntimeError } from "run-time-error-cjs";
import tar from "tar-fs";

export interface FileBase64 {
  body: string;
  filename: string;
  filepath?: string;
}
export interface organizationDefinitionFabricV2 {
  path: string;
  orgName: string;
  orgChannel: string;
  certificateAuthority: boolean;
  stateDatabase: STATE_DATABASE;
  port: string;
}

export interface EnrollFabricIdentityOptionsV1 {
  readonly wallet: Wallet;
  readonly enrollmentID: string;
  readonly organization: string;
}

/*
 * Contains options for Fabric container
 */
export interface IFabricTestLedgerV1ConstructorOptions {
  publishAllPorts: boolean;
  imageVersion?: string;
  imageName?: string;
  envVars?: Map<string, string>;
  logLevel?: LogLevelDesc;
  emitContainerLogs?: boolean;
  stateDatabase?: STATE_DATABASE;
  orgList?: string[];
  extraOrgs?: organizationDefinitionFabricV2[];
  // For test development, attach to ledger that is already running, don't spin up new one
  useRunningLedger?: boolean;
  // Defines the target network for the container.
  // Configuration will be optimized for this specific network.
  networkName?: string;
}

export enum STATE_DATABASE {
  LEVEL_DB = "leveldb",
  COUCH_DB = "couchdb",
}
export interface LedgerStartOptions {
  omitPull?: boolean;
  setContainer?: boolean;
  containerID?: string;
}

export interface PeerCerts {
  peerTlsCert: string;
  peerTlsKey: string;
  mspConfig: FileBase64[];
  peerTlsRootCert: string;
  ordererTlsRootCert: string;
}

export const DEFAULT_FABRIC_2_AIO_IMAGE_NAME =
  "ghcr.io/hyperledger/cactus-fabric2-all-in-one";
export const DEFAULT_FABRIC_2_AIO_IMAGE_VERSION = "2023-08-17-issue2057-pr2135";
export const DEFAULT_FABRIC_2_AIO_FABRIC_VERSION = "2.4.4";

export const FABRIC_25_LTS_AIO_IMAGE_VERSION =
  "2024-03-03--issue-2945-fabric-v2-5-6";
export const FABRIC_25_LTS_AIO_FABRIC_VERSION = "2.5.6";

/*
 * Provides default options for Fabric container
 */
const DEFAULT_OPTS = Object.freeze({
  imageName: "ghcr.io/hyperledger/cactus-fabric-all-in-one",
  imageVersion: "v1.0.0-rc.2",
  envVars: new Map([["FABRIC_VERSION", "1.4.8"]]),
  stateDatabase: STATE_DATABASE.COUCH_DB,
  orgList: ["org1", "org2"],
  networkName: "cactus-fabric-test-network",
});
export const FABRIC_TEST_LEDGER_DEFAULT_OPTIONS = DEFAULT_OPTS;

/*
 * Provides validations for the Fabric container's options
 */
const OPTS_JOI_SCHEMA: Joi.Schema = Joi.object().keys({
  publishAllPorts: Joi.boolean().required(),
  imageVersion: Joi.string().min(5).required(),
  imageName: Joi.string()
    .regex(/[a-z0-9]+(?:[._-]{1,2}[a-z0-9]+)*/)
    .min(1)
    .required(),
  envVars: Joi.object().pattern(/.*/, [
    Joi.string().required(),
    Joi.string().min(1).required(),
  ]),
});

export const FABRIC_TEST_LEDGER_OPTIONS_JOI_SCHEMA = OPTS_JOI_SCHEMA;

export class FabricTestLedgerV1 implements ITestLedger {
  public static readonly CLASS_NAME = "FabricTestLedgerV1";

  public readonly imageVersion: string;
  public readonly imageName: string;
  public readonly publishAllPorts: boolean;
  public readonly emitContainerLogs: boolean;
  public readonly envVars: Map<string, string>;
  public readonly stateDatabase: STATE_DATABASE;
  public orgList: string[];
  public readonly testLedgerId: string;
  public extraOrgs: organizationDefinitionFabricV2[] | undefined;

  private readonly log: Logger;

  private readonly networkName: string;
  private container: Container | undefined;
  private containerId: string | undefined;
  private readonly useRunningLedger: boolean;

  public get className(): string {
    return FabricTestLedgerV1.CLASS_NAME;
  }

  constructor(public readonly options: IFabricTestLedgerV1ConstructorOptions) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.imageVersion = options.imageVersion || DEFAULT_OPTS.imageVersion;
    this.imageName = options.imageName || DEFAULT_OPTS.imageName;
    this.publishAllPorts = options.publishAllPorts;
    this.emitContainerLogs = Bools.isBooleanStrict(options.emitContainerLogs)
      ? (options.emitContainerLogs as boolean)
      : true;
    this.envVars = options.envVars || DEFAULT_OPTS.envVars;
    this.stateDatabase = options.stateDatabase || DEFAULT_OPTS.stateDatabase;
    this.orgList = options.orgList || DEFAULT_OPTS.orgList;
    this.extraOrgs = options.extraOrgs;
    this.networkName = options.networkName || DEFAULT_OPTS.networkName;

    if (compareVersions.compare(this.getFabricVersion(), "1.4", "<"))
      this.log.warn(
        `This version of Fabric ${this.getFabricVersion()} is unsupported`,
      );

    this.useRunningLedger = Bools.isBooleanStrict(options.useRunningLedger)
      ? (options.useRunningLedger as boolean)
      : false;

    this.testLedgerId = `cactusf2aio.${this.imageVersion}.${Date.now()}`;

    this.validateConstructorOptions();
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

  public getFabricVersion(): string {
    return `${this.envVars.get("FABRIC_VERSION")}`;
  }

  public capitalizedMspIdOfOrg(organization: string): string {
    return organization.charAt(0).toUpperCase() + organization.slice(1) + "MSP";
  }

  public getDefaultMspId(): string {
    return "Org1MSP";
  }

  public async createCaClientV2(
    organization: string,
  ): Promise<FabricCAServices> {
    const fnTag = `${this.className}#createCaClientV2()`;
    this.log.debug(`${fnTag} ENTER`);
    try {
      const ccp = await this.getConnectionProfileOrgX(organization);
      const caInfo =
        ccp.certificateAuthorities["ca." + organization + ".example.com"];
      const { tlsCACerts, url: caUrl, caName } = caInfo;
      const { pem: caTLSCACertPem } = tlsCACerts;
      const tlsOptions = { trustedRoots: caTLSCACertPem, verify: false };
      this.log.debug(`createCaClientV2() caName=%o caUrl=%o`, caName, caUrl);
      this.log.debug(`createCaClientV2() tlsOptions=%o`, tlsOptions);
      return new FabricCAServices(caUrl, tlsOptions, caName);
    } catch (ex) {
      this.log.error(`createCaClientV2() Failure:`, ex);
      throw new RuntimeError(`${fnTag} Inner Exception:`, ex);
    }
  }

  public async createCaClient(): Promise<FabricCAServices> {
    const fnTag = `${this.className}#createCaClient()`;
    try {
      return this.createCaClientV2("org1");
    } catch (ex) {
      this.log.error(`createCaClient() Failure:`, ex);
      throw new RuntimeError(`${fnTag} Inner Exception:`, ex);
    }
  }

  public async enrollUserV2(opts: EnrollFabricIdentityOptionsV1): Promise<any> {
    const fnTag = `${this.className}#enrollUserV2()`;

    Checks.truthy(opts, "enrollUserV2 opts");
    Checks.nonBlankString(opts.organization, "enrollUserV2 opts.organization");
    Checks.nonBlankString(opts.enrollmentID, "enrollUserV2 opts.enrollmentID");
    Checks.truthy(opts.wallet, "enrollUserV2 opts.wallet");

    const { enrollmentID, organization, wallet } = opts;
    try {
      const mspId = this.capitalizedMspIdOfOrg(organization);
      const connectionProfile =
        await this.getConnectionProfileOrgX(organization);
      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      const discovery = { enabled: true, asLocalhost: true };
      const gatewayOptions = {
        wallet,
        identity: "admin",
        discovery,
      };
      await gateway.connect(connectionProfile, gatewayOptions);

      // Get the CA client object from the gateway for interacting with the CA.
      // const ca = gateway.getClient().getCertificateAuthority();
      const ca = await this.createCaClientV2(opts.organization);
      const adminIdentity = gateway.getIdentity();

      // Register the user, enroll the user, and import the new identity into the wallet.
      const registrationRequest = {
        affiliation: opts.organization + ".department1",
        enrollmentID: opts.enrollmentID,
        role: "client",
      };

      const provider = opts.wallet
        .getProviderRegistry()
        .getProvider(adminIdentity.type);
      const adminUser = await provider.getUserContext(adminIdentity, "admin");

      const secret = await ca.register(registrationRequest, adminUser);
      this.log.debug(`Registered client user "${enrollmentID}" OK`);

      const enrollmentRequest = { enrollmentID, enrollmentSecret: secret };
      const enrollment = await ca.enroll(enrollmentRequest);
      this.log.debug(`Enrolled client user "${enrollmentID}" OK`);

      const { certificate, key } = enrollment;
      const keyBytes = key.toBytes();

      const x509Identity: X509Identity = {
        credentials: {
          certificate: certificate,
          privateKey: keyBytes,
        },
        mspId,
        type: "X.509",
      };
      await wallet.put(enrollmentID, x509Identity);
      this.log.debug(`Wallet import of "${enrollmentID}" OK`);

      return [x509Identity, wallet];
    } catch (ex) {
      this.log.error(`${fnTag} failed with inner exception:`, ex);
      throw new RuntimeError(`${fnTag} failed with inner exception:`, ex);
    }
  }

  public async enrollUser(wallet: Wallet): Promise<any> {
    const fnTag = `${this.className}#enrollUser()`;
    try {
      const enrollmentID = "user";
      const opts = { enrollmentID, organization: "org1", wallet };
      const out = await this.enrollUserV2(opts);
      return out;
    } catch (ex) {
      this.log.error(`${fnTag} failed with inner exception:`, ex);
      throw new RuntimeError(`${fnTag} failed with inner exception:`, ex);
    }
  }

  /**
   * Tuple of [adminUsername, adminSecret]
   */
  public get adminCredentials(): [string, string] {
    return ["admin", "adminpw"];
  }

  public async enrollAdminV2(
    opts: Partial<EnrollFabricIdentityOptionsV1>,
  ): Promise<[X509Identity, Wallet]> {
    const fnTag = `${this.className}#enrollAdminV2()`;
    this.log.debug(`${fnTag} ENTER`);

    const { organization } = opts;
    if (!organization) {
      throw new RuntimeError(`${fnTag} opts.organization cannot be falsy.`);
    }
    Checks.nonBlankString(organization, `${fnTag}:opts.organization`);

    try {
      const ca = await this.createCaClientV2(organization);
      const wallet = await Wallets.newInMemoryWallet();

      // Enroll the admin user, and import the new identity into the wallet.
      const request = {
        enrollmentID: this.adminCredentials[0],
        enrollmentSecret: this.adminCredentials[1],
      };
      const enrollment = await ca.enroll(request);

      const mspId = this.capitalizedMspIdOfOrg(organization);
      const { certificate, key } = enrollment;
      const keyBytes = key.toBytes();

      const x509Identity: X509Identity = {
        credentials: {
          certificate: certificate,
          privateKey: keyBytes,
        },
        mspId,
        type: "X.509",
      };

      await wallet.put("admin", x509Identity);
      return [x509Identity, wallet];
    } catch (ex) {
      this.log.error(`${fnTag} Failure:`, ex);
      throw new RuntimeError(`${fnTag} Exception:`, ex);
    }
  }

  public async enrollAdmin(): Promise<[X509Identity, Wallet]> {
    const fnTag = `${this.className}#enrollAdmin()`;
    try {
      const out = await this.enrollAdminV2({ organization: "org1" });
      return out;
    } catch (ex) {
      this.log.error(`${fnTag} Failure:`, ex);
      throw new RuntimeError(`${fnTag} Exception:`, ex);
    }
  }

  public async getConnectionProfileOrg1(
    asLocalhost: boolean = true,
  ): Promise<any> {
    const cInfo = await this.getContainerInfo();
    const container = this.getContainer();
    const CCP_JSON_PATH_FABRIC_V2 =
      "/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json";
    const ccpJsonPath = CCP_JSON_PATH_FABRIC_V2;
    const ccpJson = await Containers.pullFile(container, ccpJsonPath);
    const ccp = JSON.parse(ccpJson);

    {
      // peer0.org1.example.com
      const privatePort = 7051;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      if (this.networkName && !asLocalhost) {
        ccp.peers["peer0.org1.example.com"].url =
          `grpcs://peer0.org1.example.com:${privatePort}`;
      } else {
        ccp.peers["peer0.org1.example.com"].url =
          `grpcs://localhost:${hostPort}`;
      }
    }
    if (ccp.peers["peer1.org1.example.com"]) {
      // peer1.org1.example.com
      const privatePort = 8051;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      if (this.networkName && !asLocalhost) {
        ccp.peers["peer1.org1.example.com"].url =
          `grpcs://peer1.org1.example.com:${privatePort}`;
      } else {
        ccp.peers["peer1.org1.example.com"].url =
          `grpcs://localhost:${hostPort}`;
      }
    }
    {
      // ca_peerOrg1
      const privatePort = 7054;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);
      const { certificateAuthorities: cas } = ccp;
      if (this.networkName && !asLocalhost) {
        cas["ca.org1.example.com"].url =
          `https://ca.org1.example.com:${privatePort}`;
      } else {
        cas["ca.org1.example.com"].url = `https://localhost:${hostPort}`;
      }
    }

    // FIXME - this still doesn't work. At this moment the only successful tests
    // we could run was with host ports bound to the matching ports of the internal
    // containers and with discovery enabled.
    // When discovery is disabled, it just doesn't yet work and these changes
    // below are my attempts so far at making the connection profile work without
    // discovery being turned on (which we cannot use when the ports are randomized
    // on the host for the parent container)
    if (this.publishAllPorts) {
      // orderer.example.com

      const privatePort = 7050;
      const hostPort = await Containers.getPublicPort(privatePort, cInfo);

      let url;
      if (this.networkName && !asLocalhost) {
        url = `grpcs://orderer.example.com:${privatePort}`;
      } else {
        url = `grpcs://localhost:${hostPort}`;
      }

      const ORDERER_PEM_PATH_FABRIC_V2 =
        "/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem";

      const ordererPemPath = ORDERER_PEM_PATH_FABRIC_V2;
      const pem = await Containers.pullFile(container, ordererPemPath);

      ccp.orderers = {
        "orderer.example.com": {
          url,
          grpcOptions: {
            "ssl-target-name-override": "orderer.example.com",
          },
          tlsCACerts: {
            pem,
          },
        },
      };

      ccp.channels = {
        mychannel: {
          orderers: ["orderer.example.com"],
          peers: {
            "peer0.org1.example.com": {
              endorsingPeer: true,
              chaincodeQuery: true,
              ledgerQuery: true,
              eventSource: true,
              discover: true,
            },
          },
        },
      };

      // FIXME: Still have no idea if we can use these options to make it work
      // with discovery
      // {
      //   const { grpcOptions } = ccp.peers["peer0.org1.example.com"];
      //   grpcOptions.hostnameOverride = `localhost`;
      // }
      // {
      //   const { grpcOptions } = ccp.peers["peer1.org1.example.com"];
      //   grpcOptions.hostnameOverride = `localhost`;
      // }
    }
    return ccp;
  }

  public async getConnectionProfileOrgX(
    orgName: string,
    asLocalhost: boolean = true,
  ): Promise<any> {
    const fnTag = `${this.className}:getConnectionProfileOrgX()`;
    this.log.debug(`${fnTag} ENTER - orgName=%s`, orgName);

    const connectionProfilePath =
      orgName === "org1" || orgName === "org2"
        ? path.join(
            "fabric-samples/test-network",
            "organizations/peerOrganizations",
            orgName + ".example.com",
            "connection-" + orgName + ".json",
          )
        : path.join(
            "add-org-" + orgName,
            "organizations/peerOrganizations",
            orgName + ".example.com",
            "connection-" + orgName + ".json",
          );
    const peer0Name = `peer0.${orgName}.example.com`;
    const peer1Name = `peer1.${orgName}.example.com`;
    const cInfo = await this.getContainerInfo();
    const container = this.getContainer();
    const CCP_JSON_PATH_FABRIC_V2 = connectionProfilePath;
    const ccpJsonPath = CCP_JSON_PATH_FABRIC_V2;
    try {
      const cId = container.id;
      this.log.debug(`${fnTag} Pull Fabric CP %s :: %s`, cId, ccpJsonPath);
      const ccpJson = await Containers.pullFile(container, ccpJsonPath);
      this.log.debug(`${fnTag} Got Fabric CP %s :: %s OK`, cId, ccpJsonPath);
      const ccp = JSON.parse(ccpJson);

      // Treat peer0
      const urlGrpcs = ccp["peers"][peer0Name]["url"];
      const privatePortPeer0 = parseFloat(urlGrpcs.replace(/^\D+/g, ""));

      const hostPort = await Containers.getPublicPort(privatePortPeer0, cInfo);

      if (this.networkName && !asLocalhost) {
        ccp["peers"][peer0Name]["url"] =
          `grpcs://peer0.${orgName}.example.com:${privatePortPeer0}`;
      } else {
        ccp["peers"][peer0Name]["url"] = `grpcs://localhost:${hostPort}`;
      }

      // if there is a peer1
      if (ccp.peers["peer1.org" + orgName + ".example.com"]) {
        const urlGrpcs = ccp["peers"][peer1Name]["url"];
        const privatePortPeer1 = parseFloat(urlGrpcs.replace(/^\D+/g, ""));

        const hostPortPeer1 = await Containers.getPublicPort(
          privatePortPeer1,
          cInfo,
        );
        if (this.networkName && !asLocalhost) {
          ccp["peers"][peer1Name]["url"] =
            `grpcs://peer1.${orgName}.example.com:${privatePortPeer1}`;
        } else {
          ccp["peers"][peer1Name]["url"] = `grpcs://localhost:${hostPortPeer1}`;
        }
      }
      {
        // ca_peerOrg1
        const caName = `ca.${orgName}.example.com`;
        const urlGrpcs = ccp["certificateAuthorities"][caName]["url"];
        const caPort = parseFloat(urlGrpcs.replace(/^\D+/g, ""));

        const caHostPort = await Containers.getPublicPort(caPort, cInfo);
        const { certificateAuthorities: cas } = ccp;
        if (this.networkName && !asLocalhost) {
          cas[caName].url = `https://ca.${orgName}.example.com:${caPort}`;
        } else {
          cas[caName].url = `https://localhost:${caHostPort}`;
        }
      }

      // FIXME - this still doesn't work. At this moment the only successful tests
      // we could run was with host ports bound to the matching ports of the internal
      // containers and with discovery enabled.
      // When discovery is disabled, it just doesn't yet work and these changes
      // below are my attempts so far at making the connection profile work without
      // discovery being turned on (which we cannot use when the ports are randomized
      // on the host for the parent container)
      if (this.publishAllPorts) {
        // orderer.example.com

        const privatePort = 7050;
        const hostPort = await Containers.getPublicPort(privatePort, cInfo);

        let url;
        if (this.networkName && !asLocalhost) {
          url = `grpcs://orderer.example.com:${privatePort}`;
        } else {
          url = `grpcs://localhost:${hostPort}`;
        }
        const ORDERER_PEM_PATH_FABRIC_V2 =
          "/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem";
        const ordererPemPath = ORDERER_PEM_PATH_FABRIC_V2;
        const pem = await Containers.pullFile(container, ordererPemPath);
        ccp.orderers = {
          "orderer.example.com": {
            url,
            grpcOptions: {
              "ssl-target-name-override": "orderer.example.com",
            },
            tlsCACerts: {
              pem,
            },
          },
        };
        const specificPeer = "peer0." + orgName + ".example.com";

        ccp.channels = {
          mychannel: {
            orderers: ["orderer.example.com"],
            peers: {},
          },
        };

        ccp.channels["mychannel"]["peers"][specificPeer] = {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
          discover: true,
        };

        // FIXME: Still have no idea if we can use these options to make it work
        // with discovery
        // {
        //   const { grpcOptions } = ccp.peers["peer0.org1.example.com"];
        //   grpcOptions.hostnameOverride = `localhost`;
        // }
        // {
        //   const { grpcOptions } = ccp.peers["peer1.org1.example.com"];
        //   grpcOptions.hostnameOverride = `localhost`;
        // }
      }
      return ccp;
    } catch (ex: unknown) {
      this.log.debug(`getConnectionProfileOrgX() crashed: `, ex);
      const e = ex instanceof Error ? ex : safeStringifyException(ex);
      throw new RuntimeError(`getConnectionProfileOrgX() crashed.`, e);
    }
  }

  /**
   * Retrieves important file contents for a given peer/org:
   * - Peer TLS certificate
   * - Peer TLS key
   * - MSP config (config.yaml)
   * - Peer TLS root certificate (ca.crt)
   * - Orderer TLS root certificate (orderer ca.crt)
   *
   * @param orgName The organization name (e.g., "org1")
   * @param peerName The peer name (e.g., "peer0")
   * @returns An object with the file contents as strings
   */
  public async getPeerOrgCertsAndConfig(
    orgName: string,
    peerName: string = "peer0",
  ): Promise<PeerCerts> {
    const fnTag = `${this.className}#getPeerOrgCertsAndConfig()`;
    try {
      const container = this.getContainer();

      // Paths inside the container
      const basePath = `/fabric-samples/test-network/organizations/peerOrganizations/${orgName}.example.com/peers/${peerName}.${orgName}.example.com`;
      const adminPath = `/fabric-samples/test-network/organizations/peerOrganizations/${orgName}.example.com/users/Admin@${orgName}.example.com`;
      const mspPath = `${adminPath}/msp`;
      const tlsPath = `${basePath}/tls`;

      // Peer TLS cert and key
      const peerTlsCertPath = `${tlsPath}/server.crt`;
      const peerTlsKeyPath = `${tlsPath}/server.key`;

      // Peer TLS root cert (ca.crt)
      const peerTlsRootCertPath = `${tlsPath}/ca.crt`;

      // Orderer TLS root cert
      const ordererTlsRootCertPath =
        "/fabric-samples/test-network/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem";

      // Pull files from container
      // Retrieve the entire MSP folder as a tar archive
      const mspFolderTar = await container.getArchive({ path: mspPath });

      // Retrieve individual files as before
      const [peerTlsCert, peerTlsKey, peerTlsRootCert, ordererTlsRootCert] =
        await Promise.all([
          Containers.pullFile(container, peerTlsCertPath),
          Containers.pullFile(container, peerTlsKeyPath),
          Containers.pullFile(container, peerTlsRootCertPath),
          Containers.pullFile(container, ordererTlsRootCertPath),
        ]);

      this.log.debug(
        `${fnTag}: Retrieved files for org "${orgName}" and peer "${peerName}"`,
      );

      this.log.debug(`${fnTag}: Peer TLS Cert: ${peerTlsCert}`);
      this.log.debug(`${fnTag}: Peer TLS Key: ${peerTlsKey}`);
      this.log.debug(`${fnTag}: Peer TLS Root Cert: ${peerTlsRootCert}`);
      this.log.debug(`${fnTag}: Orderer TLS Root Cert: ${ordererTlsRootCert}`);

      return {
        peerTlsCert,
        peerTlsKey,
        mspConfig: await this.tarBufferToFileBase64Array(mspFolderTar),
        peerTlsRootCert,
        ordererTlsRootCert,
      };
    } catch (ex) {
      this.log.error(`${fnTag}:getPeerOrgCertsAndConfig() failed:`, ex);
      throw new RuntimeError(`${fnTag}:getPeerOrgCertsAndConfig() failed`, ex);
    }
  }

  private async collectFiles(
    dir: string,
    relativePath = "",
  ): Promise<FileBase64[]> {
    const fnTag = `${this.className}#collectFiles()`;
    this.log.debug(
      `${fnTag} ENTER - dir=%s, relativePath=%s`,
      dir,
      relativePath,
    );
    const files: FileBase64[] = [];
    const entries = await fs.promises.readdir(dir, {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        files.push(...(await this.collectFiles(fullPath, relPath)));
      } else if (entry.isFile()) {
        const fileBuffer = await fs.promises.readFile(fullPath);
        const parts = relPath.split(path.sep);
        const filename = parts.pop()!;
        const filepath = parts.length ? parts.join("/") : undefined;

        files.push({
          filename,
          body: fileBuffer.toString("base64"),
          filepath,
        });
      }
    }
    return files;
  }

  private async tarBufferToFileBase64Array(
    tarBuffer: NodeJS.ReadableStream,
  ): Promise<FileBase64[]> {
    const fnTag = `${this.className}#tarBufferToFileBase64Array()`;
    temp.track();

    const tempDirPath = temp.mkdirSync("tar-extract");

    await new Promise<void>((resolve, reject) => {
      tarBuffer
        .pipe(tar.extract(tempDirPath))
        .on("finish", resolve)
        .on("error", reject);
    });

    // Find the first folder inside tempDirPath and collect files from there
    const entries = await fs.promises.readdir(tempDirPath, {
      withFileTypes: true,
    });
    const firstDir = entries.find((entry) => entry.isDirectory());
    let files: FileBase64[] = [];
    if (firstDir) {
      const innerDirPath = path.join(tempDirPath, firstDir.name);
      files = await this.collectFiles(innerDirPath);
    } else {
      files = await this.collectFiles(tempDirPath);
    }

    temp.cleanupSync();
    this.log.debug(`${fnTag} EXIT - files.length=%d`, files.length);
    return files;
  }

  public async populateFile(
    addOrgXDirectoryPath: string,
    templateType: string,
    orgName: string,
    port: string,
    destinationPath: string,
  ): Promise<any> {
    const fnTag = `FabricTestLedger#populateFile()`;
    const { log } = this;
    try {
      log.debug(`${fnTag}: init`);
      const createdFile = {
        body: "",
        filename: "",
        filepath: "",
      };
      const mspId = orgName + "MSP";
      const networkName = "cactusfabrictestnetwork";

      if (port === undefined) {
        throw new Error(`${fnTag} undefined port`);
      }

      //const dockerDirectoryAddOrgX = path.join(addOrgXDirectoryPath, "docker");

      let filename;
      switch (templateType) {
        case "couch":
          filename = `docker-compose-couch-org3.yaml`;
          break;
        case "compose":
          filename = `docker-compose-org3.yaml`;
          break;
        case "ca":
          filename = `docker-compose-ca-org3.yaml`;
          break;
        case "crypto":
          filename = `org3-crypto.yaml`;
          break;
        case "configTxGen":
          filename = `configtx-default.yaml`;
          break;
        case "updateChannelConfig":
          filename = `updateChannelConfig.sh`;
          break;
        default:
          throw new Error(`${fnTag} Template type not defined`);
      }

      const filePath = path.join(addOrgXDirectoryPath, filename);
      const contents = fs.readFileSync(filePath, "utf8");
      log.debug(`${fnTag}: loaded file: ${filename}`);
      const peer0OrgName = `peer0.${orgName}.example.com`;

      switch (templateType) {
        case "couch":
          log.debug(`${fnTag}: entered case couch`);
          //const dataCouch: IDockerFabricComposeCouchDbTemplate = yaml.load(contents);
          const dataCouch: any = yaml.load(contents);
          log.debug(dataCouch);
          //await fs.promises.writeFile("test", dataCouch);

          if (dataCouch === null || dataCouch === undefined) {
            throw new Error(`${fnTag} Could not read yaml`);
          }
          const couchDbName = `couchdb${orgName}`;
          // services: couchdbX:
          dataCouch["services"][couchDbName] =
            dataCouch["services"]["couchdb4"];
          delete dataCouch["services"]["couchdb4"];

          dataCouch["networks"]["test"]["name"] = networkName;

          dataCouch["services"][couchDbName]["container_name"] =
            `couchdb${orgName}`;
          dataCouch["services"][couchDbName]["ports"] = [`${port}:5984`];

          // services: orgX.example.com:
          dataCouch["services"][peer0OrgName] =
            dataCouch["services"]["peer0.org3.example.com"];

          dataCouch["services"][peer0OrgName]["environment"][1] =
            `CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=${couchDbName}:5984`;

          dataCouch["services"][peer0OrgName]["depends_on"] = [couchDbName];

          delete dataCouch["services"]["peer0.org3.example.com"];
          log.debug(dataCouch);

          const dumpCouch = yaml.dump(dataCouch, {
            flowLevel: -1,
            quotingType: '"',
            styles: {
              "!!int": "decimal",
              "!!null": "camelcase",
            },
          });

          createdFile.filename = `docker-compose-couch-${orgName}.yaml`;
          createdFile.filepath = path.join(
            destinationPath,
            createdFile.filename,
          );
          createdFile.body = dumpCouch;
          await fs.promises.writeFile(createdFile.filepath, createdFile.body);

          log.debug(`Created file at ${createdFile.filepath}`);
          log.debug(`docker/docker-compose-couch-${orgName}.yaml`);
          return createdFile;

        case "compose":
          log.debug(`${fnTag}: entered case compose`);
          const dataCompose: any = yaml.load(contents);
          if (dataCompose === null || dataCompose === undefined) {
            throw new Error(`${fnTag} Could not read yaml`);
          }

          log.debug("dataCompose: \n");
          log.debug(dataCompose);
          // l.9: volume name;  peer0.org3.example.com:
          dataCompose["volumes"][peer0OrgName] = null;
          delete dataCompose["volumes"]["peer0.org3.example.com"];

          //dataCompose["volumes"][orgName] = null;
          // l. 17: org name
          dataCompose["services"][peer0OrgName] =
            dataCompose["services"]["peer0.org3.example.com"];
          delete dataCompose["services"]["peer0.org3.example.com"];

          // Delete label
          delete dataCompose["networks"]["test"]["name"];
          //dataCompose['networks']['test']['name'] = networkName;
          //dataCompose["networks"]["test"] = null;
          delete dataCompose["services"][peer0OrgName]["labels"];

          //l.18: container name
          dataCompose["services"][peer0OrgName]["container_name"] =
            peer0OrgName;

          //       - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=cactusfabrictestnetwork_test

          dataCompose["services"][peer0OrgName]["environment"][1] =
            `CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=${networkName}`;

          // CORE_PEER_ID=peer0.org3.example.com
          dataCompose["services"][peer0OrgName]["environment"][8] =
            `CORE_PEER_ID=${peer0OrgName}`;

          // CORE_PEER_ADDRESS=peer0.org3.example.com:11051
          dataCompose["services"][peer0OrgName]["environment"][9] =
            `CORE_PEER_ADDRESS=${peer0OrgName}:${port}`;

          // CORE_PEER_LISTENADDRESS=0.0.0.0:11051
          dataCompose["services"][peer0OrgName]["environment"][10] =
            `CORE_PEER_LISTENADDRESS=0.0.0.0:${port}`;

          //       - CORE_PEER_CHAINCODEADDRESS=peer0.org3.example.com:11052
          const chaincodePort = parseInt(port) + 1;
          dataCompose["services"][peer0OrgName]["environment"][11] =
            `CORE_PEER_CHAINCODEADDRESS=${peer0OrgName}:${chaincodePort}`;

          //    CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:11052
          dataCompose["services"][peer0OrgName]["environment"][12] =
            `CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:${chaincodePort}`;

          //          - CORE_PEER_GOSSIP_BOOTSTRAP=peer0.org3.example.com:11051
          dataCompose["services"][peer0OrgName]["environment"][13] =
            `CORE_PEER_GOSSIP_BOOTSTRAP=${peer0OrgName}:${port}`;

          //          -       - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.org3.example.com:11051

          dataCompose["services"][peer0OrgName]["environment"][14] =
            `CORE_PEER_GOSSIP_EXTERNALENDPOINT=${peer0OrgName}:${port}`;

          //            - CORE_PEER_LOCALMSPID=Org3MSP

          dataCompose["services"][peer0OrgName]["environment"][15] =
            `CORE_PEER_LOCALMSPID=${mspId}`;

          /*
          dataCompose["services"][peer0OrgName][
            "environment"
          ][16] = `COMPOSE_PROJECT_NAME=${networkName}`;

          */

          /// Volumes
          //         - ../../organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/msp:/etc/hyperledger/fabric/msp
          dataCompose["services"][peer0OrgName]["volumes"][1] =
            `/add-org-${orgName}/organizations/peerOrganizations/${orgName}.example.com/peers/peer0.${orgName}.example.com/msp:/etc/hyperledger/fabric/msp`;

          //        - ../../organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls:/etc/hyperledger/fabric/tls
          dataCompose["services"][peer0OrgName]["volumes"][2] =
            `/add-org-${orgName}/organizations/peerOrganizations/${orgName}.example.com/peers/peer0.${orgName}.example.com/tls:/etc/hyperledger/fabric/tls`;

          //         - peer0.org3.example.com:/var/hyperledger/production
          dataCompose["services"][peer0OrgName]["volumes"][3] =
            `${peer0OrgName}:/var/hyperledger/production`;

          dataCompose["services"][peer0OrgName]["ports"] = [`${port}:${port}`];

          log.debug("dataCompose after modifications: \n");
          log.debug(dataCompose);
          const dumpCompose = yaml.dump(dataCompose, {
            flowLevel: -1,
            quotingType: '"',
            styles: {
              "!!int": "decimal",
              "!!null": "camelcase",
            },
          });

          const nullRegex = new RegExp(/Null/g);
          const newCompose = dumpCompose.replace(nullRegex, "");

          createdFile.filename = `docker-compose-${orgName}.yaml`;
          createdFile.filepath = path.join(
            destinationPath,
            createdFile.filename,
          );
          createdFile.body = newCompose;

          await fs.promises.writeFile(createdFile.filepath, createdFile.body);

          log.debug(`Created file at ${createdFile.filepath}`);
          log.debug(`docker/docker-compose-${orgName}.yaml`);

          return createdFile;

        case "ca":
          log.info(`${fnTag}: entered case ca`);
          const dataCa: any = yaml.load(contents);
          if (dataCa === null || dataCa === undefined) {
            throw new Error(`${fnTag} Could not read yaml`);
          }
          log.debug("dataCa: \n");
          log.debug(dataCa);

          const caName = `ca_${orgName}`;
          dataCa["services"][caName] = dataCa["services"]["ca_org3"];
          delete dataCa["services"]["ca_org3"];

          //      - FABRIC_CA_SERVER_CA_NAME=ca-org3
          dataCa["services"][caName]["environment"][1] =
            `FABRIC_CA_SERVER_CA_NAME=${caName}`;

          //      - FABRIC_CA_SERVER_PORT=11054
          dataCa["services"][caName]["environment"][3] =
            `FABRIC_CA_SERVER_PORT=${port}`;

          //      - "11054:11054"
          dataCa["services"][caName]["ports"] = [`${port}:${port}`];

          dataCa["services"][caName]["volumes"] = [
            `../fabric-ca/${orgName}:/etc/hyperledger/fabric-ca-server`,
          ];

          dataCa["services"][caName]["container_name"] = caName;

          log.debug("dataCa after modifications: \n");
          log.debug(dataCa);
          const dumpCa = yaml.dump(dataCa, {
            flowLevel: -1,
            quotingType: '"',
            styles: {
              "!!int": "decimal",
              "!!null": "camelcase",
            },
          });

          createdFile.filename = `docker-compose-ca-${orgName}.yaml`;
          createdFile.filepath = path.join(
            destinationPath,
            createdFile.filename,
          );
          createdFile.body = dumpCa;
          log.debug(`Created file at ${createdFile.filepath}`);
          log.debug(`docker/docker-compose-ca-${orgName}.yaml`);
          await fs.promises.writeFile(createdFile.filepath, createdFile.body);

          return createdFile;
        case "crypto":
          log.info(`${fnTag}: entered case crypto`);
          const dataCrypto: any = yaml.load(contents);
          if (dataCrypto === null || dataCrypto === undefined) {
            throw new Error(`${fnTag} Could not read yaml`);
          }
          log.debug("dataCrypto: \n");
          log.debug(dataCrypto);
          dataCrypto["PeerOrgs"][0]["Name"] = orgName;
          dataCrypto["PeerOrgs"][0]["Domain"] = `${orgName}.example.com`;

          log.debug("dataCrypto after modifications: \n");
          log.debug(dataCrypto);
          const dumpCrypto = yaml.dump(dataCrypto, {
            flowLevel: -1,
            quotingType: '"',
            styles: {
              "!!int": "decimal",
              "!!null": "camelcase",
            },
          });

          createdFile.filename = `${orgName}-crypto.yaml`;
          createdFile.filepath = path.join(
            destinationPath,
            createdFile.filename,
          );
          createdFile.body = dumpCrypto;
          log.debug(`Created file at ${createdFile.filepath}`);
          log.debug(createdFile.filename);
          await fs.promises.writeFile(createdFile.filepath, createdFile.body);

          return createdFile;
        case "configTxGen":
          log.info(`${fnTag}: entered case configTxGen`);
          const loadOptions = {
            json: true,
          };
          const dataConfigTxGen: any = yaml.load(contents, loadOptions);
          if (dataConfigTxGen === null || dataConfigTxGen === undefined) {
            throw new Error(`${fnTag} Could not read yaml`);
          }
          log.debug("dataConfigTxGen: \n");
          log.debug(dataConfigTxGen);

          // how to map     - &Org3
          // workaround: define a variable TO_REPLACE, and then manually replace that for the necessary reference
          //dataConfigTxGen["Organizations"][orgName] = dataConfigTxGen["Organizations"];
          dataConfigTxGen["Organizations"][0]["Name"] = mspId;
          dataConfigTxGen["Organizations"][0]["ID"] = mspId;
          dataConfigTxGen["Organizations"][0]["MSPDir"] =
            `organizations/peerOrganizations/${orgName}.example.com/msp`;
          dataConfigTxGen["Organizations"][0]["Policies"]["Readers"]["Rule"] =
            `OR('${mspId}.admin','${mspId}.peer','${mspId}.client')`;

          dataConfigTxGen["Organizations"][0]["Policies"]["Writers"]["Rule"] =
            `OR('${mspId}.admin','${mspId}.client')`;
          dataConfigTxGen["Organizations"][0]["Policies"]["Admins"]["Rule"] =
            `OR('${mspId}.admin')`;
          dataConfigTxGen["Organizations"][0]["Policies"]["Endorsement"][
            "Rule"
          ] = `OR('${mspId}.peer')`;

          log.debug("dataConfigTxGen after modifications: \n");
          log.debug(dataConfigTxGen);

          log.debug("dataConfigTxGen after modifications: \n");
          log.debug(dataConfigTxGen);

          const dumpConfigTxGen = yaml.dump(dataConfigTxGen, {
            flowLevel: -1,
            quotingType: '"',
            styles: {
              "!!int": "decimal",
              "!!null": "camelcase",
            },
          });

          // TODO
          const regexOrOpening = new RegExp(/OR/g);
          let replacedConfigTx = dumpConfigTxGen.replace(regexOrOpening, '"OR');

          const regexOrClosing = new RegExp(/\)/g);
          replacedConfigTx = replacedConfigTx.replace(regexOrClosing, ')"');

          const regexName = new RegExp(/Name:/g);
          replacedConfigTx = replacedConfigTx.replace(
            regexName,
            `&${orgName}\n    Name: `,
          );

          log.debug(replacedConfigTx);

          // const readersCloseRegEx = new RegExp("')");
          //dumpConfigTxGen.replace(readersCloseRegEx, "')\"");

          createdFile.filename = `configtx.yaml`;
          createdFile.filepath = path.join(
            destinationPath,
            createdFile.filename,
          );
          createdFile.body = replacedConfigTx;
          log.debug(`Created file at ${createdFile.filepath}`);
          log.debug(createdFile.filename);
          await fs.promises.writeFile(createdFile.filepath, createdFile.body);

          return createdFile;

        default:
          this.log.error(`${fnTag} template type not found`);
          throw new Error(`${fnTag} template type not found`);
      }
    } catch (error) {
      this.log.error(`populateFile() crashed: `, error);
      throw new Error(`${fnTag} Unable to run transaction: ${error}`);
    }
  }

  public setContainer(id: string): void {
    const fnTag = "FabricTestLedgerV1#setContainer()";
    let container;
    try {
      const docker = new Docker();
      container = docker.getContainer(id);
      this.container = container;
      this.containerId = id;
    } catch (error) {
      throw new Error(`${fnTag} cannot set container.`);
    }
  }

  public async addExtraOrgs(): Promise<void> {
    const fnTag = `FabricTestLedger#addOrgX()`;
    const { log } = this;
    if (!this.extraOrgs) {
      throw new Error(`${fnTag}: there are no extra orgs`);
    }

    log.debug(`
    Adding ${this.extraOrgs.length} orgs`);
    for (let i = 0; i < this.extraOrgs.length; i++) {
      await this.addOrgX(
        this.extraOrgs[i].path,
        this.extraOrgs[i].orgName,
        this.extraOrgs[i].orgChannel,
        this.extraOrgs[i].certificateAuthority,
        this.extraOrgs[i].stateDatabase,
        this.extraOrgs[i].port,
      );
    }
  }
  // req: AddOrganizationFabricV2Request
  // returns promise <AddOrganizationFabricV2Response>
  public async addOrgX(
    addOrgXDirectoryPath: string,
    orgName: string,
    channel = "mychannel",
    certificateAuthority: boolean,
    database: string,
    peerPort = "11051",
  ): Promise<void> {
    const fnTag = `FabricTestLedger#addOrgX()`;
    const { log } = this;
    log.debug(`
    Adding ${orgName} on ${channel}, with state database ${database}.
    Certification authority: ${certificateAuthority}.
    Default port: ${peerPort}
    Path to original source files: ${addOrgXDirectoryPath}`);

    if (certificateAuthority) {
      throw new Error("Adding orgs with CA enabled is not currently supported");
    }

    if (this.stateDatabase !== database) {
      log.warn(
        "Adding an organization with a different state database than org1 and org2",
      );
    }

    const peerPortNumber = Number(peerPort);
    const mspId = orgName + "MSP";

    const ssh = new NodeSSH();
    const sshConfig = await this.getSshConfig();
    await ssh.connect(sshConfig);
    log.debug(`SSH connection OK`);

    try {
      if (peerPortNumber < 1024) {
        throw new Error(`${fnTag} Invalid port, port too small`);
      }
      const couchDbPort = Math.abs(peerPortNumber - 1067).toString();
      const caPort = (peerPortNumber + 3).toString();

      temp.track();

      const tmpDirPrefix = `hyperledger-cactus-${this.className}-${this.containerId}`;
      const tmpDirPath = temp.mkdirSync(tmpDirPrefix);
      const dockerPath = path.join(addOrgXDirectoryPath, "docker");
      fs.mkdirSync(dockerPath, { recursive: true });

      const couchdbFile = await this.populateFile(
        dockerPath,
        "couch",
        orgName,
        couchDbPort,
        tmpDirPath,
      );

      const caFile = await this.populateFile(
        dockerPath,
        "ca",
        orgName,
        caPort,
        tmpDirPath,
      );

      const composeFile = await this.populateFile(
        dockerPath,
        "compose",
        orgName,
        peerPort,
        tmpDirPath,
      );

      const cryptoFile = await this.populateFile(
        addOrgXDirectoryPath,
        "crypto",
        orgName,
        peerPort,
        tmpDirPath,
      );

      const configTxGenFile = await this.populateFile(
        addOrgXDirectoryPath,
        "configTxGen",
        orgName,
        peerPort,
        tmpDirPath,
      );

      const sourceFiles = [
        couchdbFile,
        caFile,
        composeFile,
        cryptoFile,
        configTxGenFile,
      ];

      Checks.truthy(sourceFiles, `${fnTag}:sourceFiles`);
      Checks.truthy(Array.isArray(sourceFiles), `${fnTag}:sourceFiles array`);

      for (const sourceFile of sourceFiles) {
        const { filename, filepath, body } = sourceFile;
        const relativePath = filepath || "./";
        const subDirPath = path.join(tmpDirPath, relativePath);
        fs.mkdirSync(subDirPath, { recursive: true });
        const localFilePath = path.join(subDirPath, filename);
        fs.writeFileSync(localFilePath, body, "base64");
      }

      const remoteDirPath = path.join("/", "add-org-" + orgName);
      log.debug(`SCP from/to %o => %o`, addOrgXDirectoryPath, remoteDirPath);
      await ssh.putDirectory(addOrgXDirectoryPath, remoteDirPath);
      log.debug(`SCP OK %o`, remoteDirPath);

      log.debug(`SCP from/to %o => %o`, tmpDirPath, remoteDirPath);
      await ssh.putDirectory(tmpDirPath, remoteDirPath, { concurrency: 1 });
      log.debug(`SCP OK %o`, remoteDirPath);

      log.debug(`Initializing docker commands`);

      const envVarsList = {
        VERBOSE: "true",
        PATH: "$PATH:/fabric-samples/bin",
        GO111MODULE: "on",
        FABRIC_CFG_PATH: `/add-org-${orgName}`,
        FABRIC_LOGGING_SPEC: "DEBUG",
        CHANNEL_NAME: channel,
        CLI_TIMEOUT: 300,
        CLI_DELAY: 15,
        MAX_RETRY: 5,
        ORG_NAME: orgName,
        ORG_MSPID: mspId,
        DATABASE: database,
        CA: certificateAuthority,
        NEW_ORG_PORT: peerPort,
        COUCH_DB_PORT: couchDbPort,
        CA_PORT: caPort,
        CONFIG_TX_GEN_PATH: path.join(remoteDirPath),
        COMPOSE_FILE_COUCH: path.join(remoteDirPath, couchdbFile.filename),
        COMPOSE_FILE: path.join(remoteDirPath, composeFile.filename),
        COMPOSE_FILE_CA: path.join(remoteDirPath, caFile.filename),
        //COMPOSE_PROJECT_NAME: "cactusfabrictestnetwork_test",
      };

      log.debug("envVars list:");
      log.debug(envVarsList);

      console.log(composeFile);
      const sshCmdOptionsDocker: SSHExecCommandOptions = {
        execOptions: {
          pty: true,
        },
        cwd: remoteDirPath,
      };

      const envVars = Object.entries(envVarsList)
        .map(([key, value]) => `${key}=${value}`)
        .join(" ");

      log.debug("envVars loading command:");
      log.debug(envVars);

      {
        const label = "give permissions to files";
        const cmd = `chmod 777 -R *`;
        const response = await this.sshExec(
          cmd,
          label,
          ssh,
          sshCmdOptionsDocker,
        );
        log.debug(`${label} executed: ${JSON.stringify(response)}`);
      }

      {
        const label = "execute add org script";
        const cmd = certificateAuthority
          ? `${envVars} ./addOrgX.sh up -ca`
          : `${envVars} ./addOrgX.sh up`;
        const response = await this.sshExec(
          cmd,
          label,
          ssh,
          sshCmdOptionsDocker,
        );
        log.debug(`${label} executed: ${response.stdout}`);
      }

      this.orgList.push(orgName);
    } catch (error) {
      this.log.error(`addOrgX() crashed: `, error);
      throw new Error(`${fnTag} Unable to run transaction: ${error}`);
    } finally {
      try {
        ssh.dispose();
      } finally {
        temp.cleanup();
      }
    }
  }

  public async getSshConfig(asLocalhost: boolean = true): Promise<SshConfig> {
    const fnTag = "FabricTestLedger#getSshConnectionOptions()";
    if (!this.container) {
      throw new Error(`${fnTag} - invalid state no container instance set`);
    }
    const filePath = "/etc/hyperledger/cactus/fabric-aio-image.key";
    const privateKey = await Containers.pullFile(this.container, filePath);
    const containerInfo = await this.getContainerInfo();
    let port;
    let host;

    if (this.networkName && !asLocalhost) {
      host = await Containers.getContainerNetworkIP(
        containerInfo,
        this.networkName,
      );
      port = 22;
    } else {
      host = "localhost";
      port = await Containers.getPublicPort(22, containerInfo);
    }
    const sshConfig: SshConfig = {
      host,
      privateKey,
      username: "root",
      port,
    };
    return sshConfig;
  }

  private async sshExec(
    cmd: string,
    label: string,
    ssh: NodeSSH,
    sshCmdOptions: SSHExecCommandOptions,
  ): Promise<SSHExecCommandResponse> {
    this.log.debug(`${label} CMD: ${cmd}`);
    const cmdRes = await ssh.execCommand(cmd, sshCmdOptions);
    this.log.debug(`${label} CMD Response: %o`, cmdRes);
    Checks.truthy(cmdRes.code === null, `${label} cmdRes.code === null`);
    return cmdRes;
  }

  public async start(ops?: LedgerStartOptions): Promise<Container> {
    const containerNameAndTag = this.getContainerImageName();

    if (this.useRunningLedger) {
      this.log.info(
        "Search for already running Fabric Test Ledger because 'useRunningLedger' flag is enabled.",
      );
      this.log.info(
        "Search criteria - image name: ",
        containerNameAndTag,
        ", state: running",
      );
      const containerInfo = await Containers.getByPredicate(
        (ci) => ci.Image === containerNameAndTag && ci.State === "running",
      );
      const docker = new Docker();
      this.containerId = containerInfo.Id;
      this.container = docker.getContainer(this.containerId);
      return this.container;
    }

    const dockerEnvVars = envMapToDocker(this.envVars);

    if (this.container) {
      await this.container.stop();
      await this.container.remove();
    }
    const docker = new Docker();

    if (ops) {
      if (!ops.omitPull) {
        await Containers.pullImage(containerNameAndTag);
      }
      if (ops.setContainer && ops.containerID) {
        this.setContainer(ops.containerID);
        if (this.container) {
          return this.container;
        } else {
          throw new Error(
            `Cannot set container ID without a running test ledger`,
          );
        }
      }
    } else {
      // Pull image by default
      await Containers.pullImage(containerNameAndTag);
    }

    const createOptions: ContainerCreateOptions = {
      name: this.testLedgerId,
      ExposedPorts: {
        "22/tcp": {}, // OpenSSH Server - TCP
        "5984/tcp": {}, // couchdb0
        "6984/tcp": {}, // couchdb1
        "7050/tcp": {}, // orderer.example.com
        "7051/tcp": {}, // peer0.org1.example.com
        "7054/tcp": {}, // ca_peerOrg1
        "7984/tcp": {}, // couchdb2
        "8051/tcp": {}, // peer1.org1.example.com
        "8054/tcp": {}, // ca_peerOrg2
        "8984/tcp": {}, // couchdb3
        "9001/tcp": {}, // supervisord web ui/dashboard
        "9051/tcp": {}, // peer0.org2.example.com
        "10051/tcp": {}, // peer1.org2.example.com
      },

      Env: dockerEnvVars,

      HostConfig: {
        PublishAllPorts: this.publishAllPorts,
        Privileged: true,
        NetworkMode: this.networkName,
        PortBindings: {
          "22/tcp": [{ HostPort: "30022" }],
          "7050/tcp": [{ HostPort: "7050" }],
          "7051/tcp": [{ HostPort: "7051" }],
          "7054/tcp": [{ HostPort: "7054" }],
          "8051/tcp": [{ HostPort: "8051" }],
          "8054/tcp": [{ HostPort: "8054" }],
          "9051/tcp": [{ HostPort: "9051" }],
          "10051/tcp": [{ HostPort: "10051" }],
        },
      },
    };

    if (this.networkName) {
      const networks = await docker.listNetworks();
      const networkExists = networks.some((n) => n.Name === this.networkName);
      if (!networkExists) {
        await docker.createNetwork({
          Name: this.networkName,
          Driver: "bridge",
        });
      }
      createOptions.NetworkingConfig = {
        EndpointsConfig: {
          [this.networkName]: {
            Aliases: [
              "peer0.org1.example.com",
              "peer1.org1.example.com",
              "peer0.org2.example.com",
              "peer1.org2.example.com",
              "orderer.example.com",
              "ca.org1.example.com",
              "ca.org2.example.com",
            ],
          },
        },
      };
    }
    if (this.extraOrgs) {
      this.extraOrgs.forEach((org) => {
        const caPort = String(Number(org.port) + 3);
        if (createOptions["ExposedPorts"] && createOptions["HostConfig"]) {
          createOptions["ExposedPorts"][`${org.port}/tcp`] = {};
          createOptions["ExposedPorts"][`${caPort}/tcp`] = {};
          createOptions["HostConfig"]["PortBindings"][org.port] = [
            { HostPort: org.port },
          ];
          createOptions["HostConfig"]["PortBindings"][caPort] = [
            { HostPort: caPort },
          ];
        }
      });
    }
    // (createOptions as any).PortBindings = {
    //   "22/tcp": [{ HostPort: "30022" }],
    //   "7050/tcp": [{ HostPort: "7050" }],
    //   "7051/tcp": [{ HostPort: "7051" }],
    //   "7054/tcp": [{ HostPort: "7054" }],
    //   "8051/tcp": [{ HostPort: "8051" }],
    //   "8054/tcp": [{ HostPort: "8054" }],
    //   "9051/tcp": [{ HostPort: "9051" }],
    //   "10051/tcp": [{ HostPort: "10051" }],
    // };

    return new Promise<Container>((resolve, reject) => {
      const eventEmitter: EventEmitter = docker.run(
        containerNameAndTag,
        [],
        [],
        createOptions,
        {},
        (err: any) => {
          if (err) {
            reject(err);
          }
        },
      );

      eventEmitter.once("start", async (container: Container) => {
        this.container = container;
        this.containerId = container.id;

        if (this.emitContainerLogs) {
          const fnTag = `[${this.getContainerImageName()}]`;
          await Containers.streamLogs({
            container: this.getContainer(),
            tag: fnTag,
            log: this.log,
          });
        }

        try {
          await this.waitForHealthCheck();
          if (this.extraOrgs) {
            for (let i = 0; i < this.extraOrgs.length; i++) {
              await this.addOrgX(
                this.extraOrgs[i].path,
                this.extraOrgs[i].orgName,
                this.extraOrgs[i].orgChannel,
                this.extraOrgs[i].certificateAuthority,
                this.extraOrgs[i].stateDatabase,
                this.extraOrgs[i].port,
              );
            }
          }
          resolve(container);
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  public async waitForHealthCheck(timeoutMs = 180000): Promise<void> {
    const fnTag = "FabricTestLedgerV1#waitForHealthCheck()";
    const startedAt = Date.now();
    let reachable = false;
    do {
      try {
        const { Status } = await this.getContainerInfo();
        reachable = Status.endsWith(" (healthy)");
      } catch (ex) {
        reachable = false;
        if (Date.now() >= startedAt + timeoutMs) {
          throw new Error(`${fnTag} timed out (${timeoutMs}ms) -> ${ex}`);
        }
      }
      await new Promise((resolve2) => setTimeout(resolve2, 1000));
    } while (!reachable);
  }

  public stop(): Promise<unknown> {
    if (this.useRunningLedger) {
      this.log.info("Ignore stop request because useRunningLedger is enabled.");
      return Promise.resolve();
    } else if (this.container) {
      return Containers.stop(this.container);
    } else {
      return Promise.reject(
        new Error(`Container was never created, nothing to stop.`),
      );
    }
  }

  public async destroy(): Promise<void> {
    const fnTag = "FabricTestLedgerV1#destroy()";

    if (this.useRunningLedger) {
      this.log.info(
        "Ignore destroy request because useRunningLedger is enabled.",
      );
      return Promise.resolve();
    }

    try {
      if (!this.container) {
        throw new Error(`${fnTag} Container not found, nothing to destroy.`);
      }
      const docker = new Dockerode();
      const containerInfo = await this.container.inspect();
      const volumes = containerInfo.Mounts;
      await this.container.remove();
      volumes.forEach(async (volume) => {
        this.log.debug("Removing volume: ", volume);
        if (volume.Name) {
          const volumeToDelete = docker.getVolume(volume.Name);
          await volumeToDelete.remove();
        } else {
          this.log.debug("Volume", volume, "could not be removed");
        }
      });
    } catch (error) {
      this.log.debug(error);
      throw new Error(`${fnTag}": ${error}"`);
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

  public async getContainerIpAddress(): Promise<string> {
    const containerInfo = await this.getContainerInfo();
    return Containers.getContainerInternalIp(containerInfo);
  }

  private validateConstructorOptions(): void {
    const fnTag = "FabricTestLedgerV1#validateConstructorOptions()";
    const result = OPTS_JOI_SCHEMA.validate({
      imageVersion: this.imageVersion,
      imageName: this.imageName,
      publishAllPorts: this.publishAllPorts,
      envVars: this.envVars,
    });

    if (result.error) {
      throw new Error(`${fnTag} ${result.error.annotate()}`);
    }
  }

  public getNetworkName(): string {
    const fnTag = "FabricTestLedgerV1#getNetworkName()";
    if (this.networkName) {
      return this.networkName;
    }
    throw new Error(`${fnTag} network name not set`);
  }
}
