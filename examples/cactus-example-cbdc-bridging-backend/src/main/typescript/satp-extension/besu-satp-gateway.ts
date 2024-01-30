/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  DefaultApi as BesuApi,
  Web3SigningCredential,
  EthContractInvocationType,
  InvokeContractV1Request as BesuInvokeContractV1Request,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  IPluginSatpGatewayConstructorOptions,
  PluginSATPGateway,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { SessionDataRollbackActionsPerformedEnum } from "@hyperledger/cactus-plugin-satp-hermes";

export interface IBesuSATPGatewayConstructorOptions
  extends IPluginSatpGatewayConstructorOptions {
  besuContractName?: string;
  besuWeb3SigningCredential?: Web3SigningCredential;
  besuKeychainId?: string;
  besuAssetID?: string;
  besuPath?: string;
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

  async isValidBridgeBackCBDC(
    assetID: string,
    amount: number,
    user: string,
  ): Promise<void> {
    // we should verify if the CBDC being bridged is valid or not
    // e.g. if a client is trying to send more CBDC than what was escrowed

    if (this.besuApi != undefined) {
      const response = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Call,
        methodName: "checkValidBridgeBack",
        gas: 1000000,
        params: [assetID, amount, user],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (response.data.callOutput != true) {
        throw new Error(`${response.statusText}`);
      }
    }
  }

  async createAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#createAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.assetProfile == undefined ||
      sessionData.assetProfile.keyInformationLink == undefined ||
      sessionData.assetProfile.keyInformationLink.length != 3
    ) {
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
      const amount = sessionData.assetProfile.keyInformationLink[0].toString();
      const userEthAddress =
        sessionData.assetProfile.keyInformationLink[2].toString();

      const besuCreateRes = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "mint",
        gas: 1000000,
        params: [userEthAddress, amount],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (besuCreateRes.status != 200) {
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

  async deleteAsset(sessionID: string, assetID?: string): Promise<string> {
    const fnTag = `${this.className}#deleteAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (assetID == undefined) {
      assetID = sessionData.sourceLedgerAssetID;
    }

    let besuDeleteAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const besuAssetDeletion = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "deleteAssetReference",
        gas: 1000000,
        params: [assetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (besuAssetDeletion.status != 200) {
        throw new Error(`${fnTag}, besu delete asset error`);
      }

      const besuAssetDeletionDataJson = JSON.parse(
        JSON.stringify(besuAssetDeletion.data),
      );

      if (besuAssetDeletionDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (besuAssetDeletionDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuAssetDeletionReceipt =
        besuAssetDeletionDataJson.out.transactionReceipt;
      besuDeleteAssetProof = JSON.stringify(besuAssetDeletionReceipt);
    }

    sessionData.commitFinalClaim = besuDeleteAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset deletion: ${besuDeleteAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "delete",
      data: besuDeleteAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    return besuDeleteAssetProof;
  }

  async lockAsset(sessionID: string, assetID?: string): Promise<string> {
    const fnTag = `${this.className}#lockAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    if (assetID == undefined) {
      assetID = sessionData.sourceLedgerAssetID;
    }

    let besuLockAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "lock-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const besuAssetLock = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "lockAssetReference",
        gas: 1000000,
        params: [assetID],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (besuAssetLock.status != 200) {
        throw new Error(`${fnTag}, besu lock asset error`);
      }

      const besuAssetLockDataJson = JSON.parse(
        JSON.stringify(besuAssetLock.data),
      );

      if (besuAssetLockDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (besuAssetLockDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuAssetLockReceipt = besuAssetLockDataJson.out.transactionReceipt;
      besuLockAssetProof = JSON.stringify(besuAssetLockReceipt);
    }

    sessionData.lockEvidenceClaim = besuLockAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(`${fnTag}, proof of the asset lock: ${besuLockAssetProof}`);

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "lock",
      data: besuLockAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
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
        methodName: "unLockAssetReference",
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

  async createAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    const fnTag = `${this.className}#createAssetToRollback()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      sessionData.rollbackActionsPerformed == undefined ||
      sessionData.rollbackProofs == undefined ||
      sessionData.assetProfile == undefined ||
      sessionData.assetProfile.keyInformationLink == undefined ||
      sessionData.assetProfile.keyInformationLink.length != 3
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let besuCreateAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.besuApi != undefined) {
      const amount = sessionData.assetProfile.keyInformationLink[0].toString();
      const userEthAddress =
        sessionData.assetProfile.keyInformationLink[2].toString();

      const assetCreateResponse = await this.besuApi.invokeContractV1({
        contractName: this.besuContractName,
        invocationType: EthContractInvocationType.Send,
        methodName: "createAssetReference",
        gas: 1000000,
        params: [assetID, amount, userEthAddress],
        signingCredential: this.besuWeb3SigningCredential,
        keychainId: this.besuKeychainId,
      } as BesuInvokeContractV1Request);

      if (assetCreateResponse.status != 200) {
        throw new Error(`${fnTag}, besu unlock asset error`);
      }

      const assetCreateResponseDataJson = JSON.parse(
        JSON.stringify(assetCreateResponse.data),
      );

      if (assetCreateResponseDataJson.out == undefined) {
        throw new Error(`${fnTag}, besu res data out undefined`);
      }

      if (assetCreateResponseDataJson.out.transactionReceipt == undefined) {
        throw new Error(`${fnTag}, undefined besu transact receipt`);
      }

      const besuCreateAssetReceipt =
        assetCreateResponseDataJson.out.transactionReceipt;
      besuCreateAssetProof = JSON.stringify(besuCreateAssetReceipt);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Create,
    );
    sessionData.rollbackProofs.push(besuCreateAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset create: ${besuCreateAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "create",
      data: besuCreateAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    return besuCreateAssetProof;
  }

  async deleteAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    // not implemented. We assume the agreement was reached after the final interactions in each ledger
    // (delete in the source chain and create in the side chain)
    return `not implemented: ${sessionID}, ${assetID}`;
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
        await this.createAssetToRollback(
          sessionID,
          sessionData.sourceLedgerAssetID,
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
