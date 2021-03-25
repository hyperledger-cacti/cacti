import { Account } from "web3-core";
//import fs from "fs";
//import path from "path";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PluginLedgerConnectorBesu } from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  PluginLedgerConnectorQuorum,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-quorum";
import {
  BesuTestLedger,
  FabricTestLedgerV1,
  QuorumTestLedger,
} from "@hyperledger/cactus-test-tooling";

import {
  bytecode as BambooHarvestRepositoryBytecode,
  abi as BambooHarvestRepositoryAbi,
} from "../../json/generated/BambooHarvestRepository.json";
import {
  bytecode as BookshelfRepositoryBytecode,
  abi as BookshelfRepositoryAbi,
} from "../../json/generated/BookshelfRepository.json";
import {
  IEthContractDeployment,
  ISupplyChainContractDeploymentInfo,
  IFabricContractDeployment,
  //  OrgEnv,
} from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";
import {
  PluginLedgerConnectorFabric,
  DefaultEventHandlerStrategy,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { DiscoveryOptions } from "fabric-network";
import { SHIPMENT_CONTRACT_GO_SOURCE } from "../../go/shipment";

export const org1Env = {
  CORE_PEER_LOCALMSPID: "Org1MSP",
  CORE_PEER_ADDRESS: "peer0.org1.example.com:7051",
  CORE_PEER_MSPCONFIGPATH:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp",
  CORE_PEER_TLS_ROOTCERT_FILE:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt",
  ORDERER_TLS_ROOTCERT_FILE:
    "/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem",
};

export interface ISupplyChainAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
}

/**
 * Contains code that is meant to simulate parts of a production grade deployment
 * that would otherwise not be part of the application itself.
 *
 * The reason for this being in existence is so that we can have tutorials that
 * are self-contained instead of starting with a multi-hour setup process where
 * the user is expected to set up ledgers from scratch with all the bells and
 * whistles.
 * The sole purpose of this is to have people ramp up with Cactus as fast as
 * possible.
 */
export class SupplyChainAppDummyInfrastructure {
  public static readonly CLASS_NAME = "SupplyChainAppDummyInfrastructure";

  public readonly besu: BesuTestLedger;
  public readonly quorum: QuorumTestLedger;
  public readonly fabric: FabricTestLedgerV1;
  private readonly log: Logger;
  private _quorumAccount: Account | undefined;
  private _besuAccount: Account | undefined;

  public get quorumAccount() {
    if (!this._quorumAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._quorumAccount;
    }
  }

  public get besuAccount() {
    if (!this._besuAccount) {
      throw new Error(`Must call deployContracts() first.`);
    } else {
      return this._besuAccount;
    }
  }

  public get className() {
    return SupplyChainAppDummyInfrastructure.CLASS_NAME;
  }

  constructor(
    public readonly options: ISupplyChainAppDummyInfrastructureOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    const level = this.options.logLevel || "INFO";
    const label = this.className;
    this.log = LoggerProvider.getOrCreate({ level, label });

    this.besu = new BesuTestLedger();
    this.quorum = new QuorumTestLedger();
    this.fabric = new FabricTestLedgerV1({
      publishAllPorts: true,
      imageName: "hyperledger/cactus-fabric-all-in-one",
      imageVersion: "2021-03-02-ssh-hotfix",
    });
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.all([
        this.besu.stop().then(() => this.besu.destroy()),
        this.quorum.stop().then(() => this.quorum.destroy()),
        this.fabric.stop().then(() => this.fabric.destroy()),
      ]);
      this.log.info(`Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure...`);
      await Promise.all([
        this.besu.start(),
        this.quorum.start(),
        this.fabric.start(),
      ]);
      this.log.info(`Started dummy infrastructure OK`);
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async deployContracts(): Promise<ISupplyChainContractDeploymentInfo> {
    try {
      this.log.info(`Deploying smart contracts...`);

      let bambooHarvestRepository: IEthContractDeployment;
      let bookshelfRepository: IEthContractDeployment;
      let shipmentRepository: IFabricContractDeployment;

      {
        this._quorumAccount = await this.quorum.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.quorum.getRpcApiHttpHost();

        const connector = new PluginLedgerConnectorQuorum({
          instanceId: "PluginLedgerConnectorQuorum_Contract_Deployment",
          rpcApiHttpHost,
          logLevel: this.options.logLevel,
          pluginRegistry: new PluginRegistry(),
        });

        const res = await connector.deployContract({
          bytecode: BambooHarvestRepositoryBytecode,
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.quorumAccount.address,
            secret: this.quorumAccount.privateKey,
            type: Web3SigningCredentialType.PRIVATEKEYHEX,
          },
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bambooHarvestRepository = {
          abi: BambooHarvestRepositoryAbi,
          address: contractAddress as string,
          bytecode: BambooHarvestRepositoryBytecode,
        };
      }

      {
        this._besuAccount = await this.besu.createEthTestAccount(2000000);
        const rpcApiHttpHost = await this.besu.getRpcApiHttpHost();

        const connector = new PluginLedgerConnectorBesu({
          instanceId: "PluginLedgerConnectorBesu_Contract_Deployment",
          rpcApiHttpHost,
          logLevel: this.options.logLevel,
          pluginRegistry: new PluginRegistry(),
        });

        const res = await connector.deployContract({
          bytecode: BookshelfRepositoryBytecode,
          gas: 1000000,
          web3SigningCredential: {
            ethAccount: this.besuAccount.address,
            secret: this.besuAccount.privateKey,
            type: Web3SigningCredentialType.PRIVATEKEYHEX,
          },
        });
        const {
          transactionReceipt: { contractAddress },
        } = res;

        bookshelfRepository = {
          abi: BookshelfRepositoryAbi,
          address: contractAddress as string,
          bytecode: BookshelfRepositoryBytecode,
        };
      }

      {
        const connectionProfile = await this.fabric.getConnectionProfileOrg1();
        const sshConfig = await this.fabric.getSshConfig();
        const discoveryOptions: DiscoveryOptions = {
          enabled: true,
          asLocalhost: true,
        };

        const connector = new PluginLedgerConnectorFabric({
          instanceId: "PluginLedgerConnectorFabric_Contract_Deployment",
          dockerBinary: "/usr/local/bin/docker",
          pluginRegistry: new PluginRegistry(),
          sshConfig: sshConfig,
          logLevel: this.options.logLevel || "INFO",
          connectionProfile: connectionProfile,
          cliContainerEnv: org1Env,
          discoveryOptions: discoveryOptions,
          eventHandlerOptions: {
            strategy: DefaultEventHandlerStrategy.NETWORKSCOPEALLFORTX,
          },
        });

        const res = await connector.deployContract({
          tlsRootCertFiles: org1Env.CORE_PEER_TLS_ROOTCERT_FILE as string,
          targetPeerAddresses: [org1Env.CORE_PEER_ADDRESS as string],
          policyDslSource: "OR('Org1MSP.member','Org2MSP.member')",
          channelId: "mychannel",
          chainCodeVersion: "1.0.0",
          constructorArgs: { Args: [] },
          goSource: {
            body: Buffer.from(SHIPMENT_CONTRACT_GO_SOURCE).toString("base64"),
            filename: "shipment.go",
          },
          moduleName: "shipment",
          targetOrganizations: [org1Env],
          pinnedDeps: ["github.com/hyperledger/fabric@v1.4.8"],
        });
        this.log.debug(res);

        shipmentRepository = {
          chaincodeId: "shipment",
          channelName: "mychannel",
        };
      }

      const out: ISupplyChainContractDeploymentInfo = {
        bambooHarvestRepository,
        bookshelfRepository,
        shipmentRepository,
      };

      this.log.info(`Deployed smart contracts OK`);

      return out;
    } catch (ex) {
      this.log.error(`Deployment of smart contracts crashed: `, ex);
      throw ex;
    }
  }
}
