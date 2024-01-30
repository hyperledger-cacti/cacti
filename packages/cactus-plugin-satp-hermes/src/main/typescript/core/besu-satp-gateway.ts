/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Configuration } from "@hyperledger/cactus-core-api";
import { SessionDataRollbackActionsPerformedEnum } from "../generated/openapi/typescript-axios";
import {
  DefaultApi as BesuApi,
  Web3SigningCredential,
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  IPluginSatpGatewayConstructorOptions,
  PluginSATPGateway,
} from "../plugin-satp-gateway";

export interface IBesuSATPGatewayConstructorOptions
  extends IPluginSatpGatewayConstructorOptions {
  besuPath?: string;
  besuContractName?: string;
  besuWeb3SigningCredential?: Web3SigningCredential;
  besuKeychainId?: string;
  besuAssetID?: string;
}

export class BesuSATPGateway extends PluginSATPGateway {
  public besuApi?: BesuApi;
  public besuContractName?: string;
  public besuWeb3SigningCredential?: Web3SigningCredential;
  public besuKeychainId?: string;

  public constructor(options: IBesuSATPGatewayConstructorOptions) {
    super({
      name: options.name,
      dltIDs: options.dltIDs,
      instanceId: options.instanceId,
      keyPair: options.keyPair,
      backupGatewaysAllowed: options.backupGatewaysAllowed,
      ipfsPath: options.ipfsPath,
      clientHelper: options.clientHelper,
      serverHelper: options.serverHelper,
      knexLocalConfig: options.knexLocalConfig,
      knexRemoteConfig: options.knexRemoteConfig,
    });

    if (options.besuPath != undefined) this.defineBesuConnection(options);
  }

  private defineBesuConnection(
    options: IBesuSATPGatewayConstructorOptions,
  ): void {
    const fnTag = `${this.className}#defineBesuConnection()`;

    const config = new Configuration({ basePath: options.besuPath });
    const apiClient = new BesuApi(config);
    this.besuApi = apiClient;
    const notEnoughBesuParams: boolean =
      options.besuContractName == undefined ||
      options.besuWeb3SigningCredential == undefined ||
      options.besuKeychainId == undefined;
    if (notEnoughBesuParams) {
      throw new Error(
        `${fnTag}, besu params missing. Should have: signing credentials, contract name, key chain ID, asset ID`,
      );
    }
    this.besuContractName = options.besuContractName;
    this.besuWeb3SigningCredential = options.besuWeb3SigningCredential;
    this.besuKeychainId = options.besuKeychainId;
  }

  async createAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#createAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (assetId == undefined) {
      assetId = sessionData.recipientLedgerAssetID;
    }

    let besuCreateAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const besuCreateRes = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "createAsset",
        gas: 1000000,
        params: [assetId, 100], //the second is size, may need to pass this from client?
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (besuCreateRes.status != 200) {
        //await this.Revert(sessionID);
        throw new Error(`${fnTag}, besu create asset error`);
      }

      const besuCreateResDataJson = JSON.parse(
        JSON.stringify(besuCreateRes.data),
      );

      if (besuCreateResDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (besuCreateResDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        besuCreateResDataJson.out.transactionReceipt;
      besuCreateAssetProof = JSON.stringify(besuCreateAssetReceipt);
    }

    sessionData.commitAcknowledgementClaim = besuCreateAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset creation: ${besuCreateAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "create",
      data: besuCreateAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    return besuCreateAssetProof;
  }

  async lockAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#lockAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.rollbackActionsPerformed == undefined ||
      sessionData.rollbackProofs == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let besuLockAssetProof = "";

    if (assetId == undefined) {
      assetId = sessionData.sourceLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "lock-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const assetLockResponse = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAsset",
        gas: 1000000,
        params: [assetId],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (assetLockResponse.status != 200) {
        throw new Error(`${fnTag}, besu lock asset error`);
      }

      const assetLockResponseDataJson = JSON.parse(
        JSON.stringify(assetLockResponse.data),
      );

      if (assetLockResponseDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (assetLockResponseDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        assetLockResponseDataJson.out.transactionReceipt;
      besuLockAssetProof = JSON.stringify(besuCreateAssetReceipt);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Lock,
    );
    sessionData.rollbackProofs.push(besuLockAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(`${fnTag}, proof of the asset lock: ${besuLockAssetProof}`);

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "lock",
      data: besuLockAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "lock-asset",
      data: JSON.stringify(sessionData),
    });

    return besuLockAssetProof;
  }

  async unlockAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#unlockAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.rollbackActionsPerformed == undefined ||
      sessionData.rollbackProofs == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let besuUnlockAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "unlock-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const assetUnlockResponse = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAsset",
        gas: 1000000,
        params: [assetId],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (assetUnlockResponse.status != 200) {
        throw new Error(`${fnTag}, besu unlock asset error`);
      }

      const assetUnlockResponseDataJson = JSON.parse(
        JSON.stringify(assetUnlockResponse.data),
      );

      if (assetUnlockResponseDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (assetUnlockResponseDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        assetUnlockResponseDataJson.out.transactionReceipt;
      besuUnlockAssetProof = JSON.stringify(besuCreateAssetReceipt);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Lock,
    );
    sessionData.rollbackProofs.push(besuUnlockAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset unlock: ${besuUnlockAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "unlock",
      data: besuUnlockAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "unlock-asset",
      data: JSON.stringify(sessionData),
    });

    return besuUnlockAssetProof;
  }

  async deleteAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    const fnTag = `${this.className}#deleteAssetToRollback()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.rollbackActionsPerformed == undefined ||
      sessionData.rollbackProofs == undefined
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let besuDeleteAssetProof = "";

    if (assetID == undefined) {
      assetID = sessionData.sourceLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      // we need to lock the asset first
      await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAsset",
        gas: 1000000,
        params: [assetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      const assetCreationResponse = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "deleteAsset",
        gas: 1000000,
        params: [assetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (assetCreationResponse.status != 200) {
        throw new Error(`${fnTag}, besu delete asset error`);
      }

      const assetCreationResponseDataJson = JSON.parse(
        JSON.stringify(assetCreationResponse.data),
      );

      if (assetCreationResponseDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (assetCreationResponseDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        assetCreationResponseDataJson.out.transactionReceipt;
      besuDeleteAssetProof = JSON.stringify(besuCreateAssetReceipt);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Delete,
    );
    sessionData.rollbackProofs.push(besuDeleteAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset deletion: ${besuDeleteAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "delete",
      data: besuDeleteAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    return besuDeleteAssetProof;
  }

  // Not implementing these methods because this class is an example
  // of a client gateway. They are only used for server gateways.
  deleteAsset(
    sessionID: string,
    assetID?: string | undefined,
  ): Promise<string> {
    return new Promise(() => `${sessionID}, ${assetID}`);
  }

  async createAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    return new Promise(() => `${sessionID}, ${assetID}`);
  }

  async rollback(sessionID: string) {
    const fnTag = `${this.className}#rollback()`;
    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.step == undefined ||
      sessionData.lastSequenceNumber == undefined
    ) {
      throw new Error(`${fnTag}, session data is undefined`);
    }

    sessionData.rollback = true;

    this.log.info(`${fnTag}, rolling back session ${sessionID}`);

    if (
      this.besuApi == undefined ||
      this.besuContractName == undefined ||
      this.besuKeychainId == undefined ||
      this.besuWeb3SigningCredential == undefined ||
      sessionData.sourceLedgerAssetID == undefined ||
      sessionData.recipientLedgerAssetID == undefined
    ) {
      return;
    }

    if (this.isClientGateway(sessionID)) {
      if (await this.besuAssetExists(sessionData.sourceLedgerAssetID)) {
        if (await this.isBesuAssetLocked(sessionData.sourceLedgerAssetID)) {
          // Rollback locking of the asset
          await this.unlockAsset(sessionID, sessionData.sourceLedgerAssetID);
        }
      } else {
        // Rollback extinguishment of the asset
        await this.createAsset(sessionID, sessionData.sourceLedgerAssetID);
      }
    } else {
      if (await this.besuAssetExists(sessionData.recipientLedgerAssetID)) {
        // Rollback creation of the asset
        await this.deleteAssetToRollback(
          sessionID,
          sessionData.recipientLedgerAssetID,
        );
      }
    }
  }

  /* Helper functions */
  async besuAssetExists(besuAssetID: string): Promise<boolean> {
    const fnTag = `${this.className}#besuAssetExists()`;

    const assetExists = await this.besuApi?.invokeContractV1({
      contractName: this.besuContractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "isPresent",
      gas: 1000000,
      params: [besuAssetID],
      signingCredential: this.besuWeb3SigningCredential,
      keychainId: this.besuKeychainId,
    } as BesuInvokeContractV1Request);

    if (assetExists == undefined) {
      throw new Error(`${fnTag} the asset does not exist`);
    }

    return assetExists?.data.callOutput == true;
  }

  async isBesuAssetLocked(besuAssetID: string): Promise<boolean> {
    const fnTag = `${this.className}#isBesuAssetLocked()`;

    const assetIsLocked = await this.besuApi?.invokeContractV1({
      contractName: this.besuContractName,
      invocationType: EthContractInvocationType.Call,
      methodName: "isAssetLocked",
      gas: 1000000,
      params: [besuAssetID],
      signingCredential: this.besuWeb3SigningCredential,
      keychainId: this.besuKeychainId,
    } as BesuInvokeContractV1Request);

    if (assetIsLocked == undefined) {
      throw new Error(`${fnTag} the asset does not exist`);
    }

    return assetIsLocked?.data.callOutput == true;
  }
}
