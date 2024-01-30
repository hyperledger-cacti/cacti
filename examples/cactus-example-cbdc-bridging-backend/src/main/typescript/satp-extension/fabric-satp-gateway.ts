/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  DefaultApi as FabricApi,
  FabricSigningCredential,
  FabricContractInvocationType,
  RunTransactionRequest as FabricRunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  IPluginSatpGatewayConstructorOptions,
  PluginSATPGateway,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { SessionDataRollbackActionsPerformedEnum } from "@hyperledger/cactus-plugin-satp-hermes";

export interface IFabricSATPGatewayConstructorOptions
  extends IPluginSatpGatewayConstructorOptions {
  fabricPath?: string;
  fabricSigningCredential?: FabricSigningCredential;
  fabricChannelName?: string;
  fabricContractName?: string;
}

export class FabricSATPGateway extends PluginSATPGateway {
  public fabricApi?: FabricApi;
  public fabricSigningCredential?: FabricSigningCredential;
  public fabricChannelName?: string;
  public fabricContractName?: string;

  public constructor(options: IFabricSATPGatewayConstructorOptions) {
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

    if (options.fabricPath != undefined) this.defineFabricConnection(options);
  }

  private defineFabricConnection(
    options: IFabricSATPGatewayConstructorOptions,
  ): void {
    const fnTag = `${this.className}#defineFabricConnection()`;

    const config = new Configuration({ basePath: options.fabricPath });
    const apiClient = new FabricApi(config);
    this.fabricApi = apiClient;
    const notEnoughFabricParams: boolean =
      options.fabricSigningCredential == undefined ||
      options.fabricChannelName == undefined ||
      options.fabricContractName == undefined;
    if (notEnoughFabricParams) {
      throw new Error(
        `${fnTag}, fabric params missing should have: signing credentials, contract name, channel name, asset ID`,
      );
    }
    this.fabricSigningCredential = options.fabricSigningCredential;
    this.fabricChannelName = options.fabricChannelName;
    this.fabricContractName = options.fabricContractName;
  }

  async isValidBridgeOutCBDC(
    assetID: string,
    amount: number,
    fabricID: string,
    ethAddress: string,
  ) {
    // we should verify if the CBDC being bridged is valid or not
    // e.g. if a client is trying to send CBDC to another client in the sidechain, this should fail

    if (this.fabricApi != undefined) {
      await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "CheckValidBridgeOut",
        params: [assetID, amount, fabricID, ethAddress],
      } as FabricRunTransactionRequest);
    }
  }

  async isValidBridgeBackCBDC(fabricID: string, ethAddress: string) {
    // we should verify if the CBDC being bridged is valid or not
    // e.g. if a client is trying to send CBDC to another client in the sidechain, this should fail

    if (this.fabricApi != undefined) {
      await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Call,
        methodName: "CheckValidBridgeBack",
        params: [fabricID, ethAddress],
      } as FabricRunTransactionRequest);
    }
  }

  async lockAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#lockAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let fabricLockAssetProof = "";

    if (assetId == undefined) {
      assetId = sessionData.sourceLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "lock-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.fabricApi != undefined) {
      const response = await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "LockAssetReference",
        params: [assetId],
      } as FabricRunTransactionRequest);

      const receiptLockRes = await this.fabricApi.getTransactionReceiptByTxIDV1(
        {
          signingCredential: this.fabricSigningCredential,
          channelName: this.fabricChannelName,
          contractName: "qscc",
          invocationType: FabricContractInvocationType.Call,
          methodName: "GetBlockByTxID",
          params: [this.fabricChannelName, response.data.transactionId],
        } as FabricRunTransactionRequest,
      );

      this.log.warn(receiptLockRes.data);
      fabricLockAssetProof = JSON.stringify(receiptLockRes.data);
    }

    sessionData.lockEvidenceClaim = fabricLockAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(`${fnTag}, proof of the asset lock: ${fabricLockAssetProof}`);

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "lock",
      data: fabricLockAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
      operation: "lock-asset",
      data: JSON.stringify(sessionData),
    });

    return fabricLockAssetProof;
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

    let fabricUnlockAssetProof = "";

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "unlock-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.fabricApi != undefined) {
      const response = await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "UnlockAssetReference",
        params: [assetId],
      } as FabricRunTransactionRequest);

      const receiptUnlock = await this.fabricApi.getTransactionReceiptByTxIDV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: "qscc",
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetBlockByTxID",
        params: [this.fabricChannelName, response.data.transactionId],
      } as FabricRunTransactionRequest);

      this.log.warn(receiptUnlock.data);
      fabricUnlockAssetProof = JSON.stringify(receiptUnlock.data);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Unlock,
    );
    sessionData.rollbackProofs.push(fabricUnlockAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset unlock: ${fabricUnlockAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "unlock",
      data: fabricUnlockAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "unlock-asset",
      data: JSON.stringify(sessionData),
    });

    return fabricUnlockAssetProof;
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

    let fabricCreateAssetProof = "";

    if (assetId == undefined) {
      assetId = sessionData.recipientLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.fabricApi != undefined) {
      const amount = sessionData.assetProfile.keyInformationLink[0].toString();
      const fabricClientID =
        sessionData.assetProfile.keyInformationLink[1].toString();
      const userEthAddress =
        sessionData.assetProfile.keyInformationLink[2].toString();

      const response = await this.fabricApi.runTransactionV1({
        contractName: this.fabricContractName,
        channelName: this.fabricChannelName,
        params: [amount, fabricClientID, userEthAddress],
        methodName: "Refund",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: this.fabricSigningCredential,
      } as FabricRunTransactionRequest);

      const receiptCreateRes =
        await this.fabricApi.getTransactionReceiptByTxIDV1({
          signingCredential: this.fabricSigningCredential,
          channelName: this.fabricChannelName,
          contractName: "qscc",
          invocationType: FabricContractInvocationType.Call,
          methodName: "GetBlockByTxID",
          params: [this.fabricChannelName, response.data.transactionId],
        } as FabricRunTransactionRequest);

      this.log.warn(receiptCreateRes.data);
      fabricCreateAssetProof = JSON.stringify(receiptCreateRes.data);
    }

    sessionData.commitAcknowledgementClaim = fabricCreateAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset create: ${fabricCreateAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "create",
      data: fabricCreateAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    return fabricCreateAssetProof;
  }

  async deleteAsset(sessionID: string, assetId?: string): Promise<string> {
    const fnTag = `${this.className}#deleteAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (sessionData == undefined) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let fabricDeleteAssetProof = "";

    if (assetId == undefined) {
      assetId = sessionData.sourceLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.fabricApi != undefined) {
      const deleteRes = await this.fabricApi.runTransactionV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: this.fabricContractName,
        invocationType: FabricContractInvocationType.Send,
        methodName: "DeleteAssetReference",
        params: [assetId],
      } as FabricRunTransactionRequest);

      const receiptDeleteRes =
        await this.fabricApi.getTransactionReceiptByTxIDV1({
          signingCredential: this.fabricSigningCredential,
          channelName: this.fabricChannelName,
          contractName: "qscc",
          invocationType: FabricContractInvocationType.Call,
          methodName: "GetBlockByTxID",
          params: [this.fabricChannelName, deleteRes.data.transactionId],
        } as FabricRunTransactionRequest);

      this.log.warn(receiptDeleteRes.data);
      fabricDeleteAssetProof = JSON.stringify(receiptDeleteRes.data);
    }

    sessionData.commitFinalClaim = fabricDeleteAssetProof;

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset deletion: ${fabricDeleteAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof",
      operation: "delete",
      data: fabricDeleteAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done",
      operation: "delete-asset",
      data: JSON.stringify(sessionData),
    });

    return fabricDeleteAssetProof;
  }

  async createAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    const fnTag = `${this.className}#createAsset()`;

    const sessionData = this.sessions.get(sessionID);

    if (
      sessionData == undefined ||
      this.fabricChannelName == undefined ||
      this.fabricContractName == undefined ||
      this.fabricSigningCredential == undefined ||
      sessionData.rollbackProofs == undefined ||
      sessionData.rollbackActionsPerformed == undefined ||
      sessionData.assetProfile == undefined ||
      sessionData.assetProfile.keyInformationLink == undefined ||
      sessionData.assetProfile.keyInformationLink.length != 3
    ) {
      throw new Error(`${fnTag}, session data is not correctly initialized`);
    }

    let fabricCreateAssetProof = "";

    if (assetID == undefined) {
      assetID = sessionData.recipientLedgerAssetID;
    }

    await this.storeLog({
      sessionID: sessionID,
      type: "exec-rollback",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    if (this.fabricApi != undefined) {
      const amount = sessionData.assetProfile.keyInformationLink[0].toString();
      const userEthAddress =
        sessionData.assetProfile.keyInformationLink[2].toString();

      const response = await this.fabricApi.runTransactionV1({
        contractName: this.fabricContractName,
        channelName: this.fabricChannelName,
        params: [assetID, amount, userEthAddress],
        methodName: "CreateAssetReference",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: this.fabricSigningCredential,
      } as FabricRunTransactionRequest);

      const receiptCreate = await this.fabricApi.getTransactionReceiptByTxIDV1({
        signingCredential: this.fabricSigningCredential,
        channelName: this.fabricChannelName,
        contractName: "qscc",
        invocationType: FabricContractInvocationType.Call,
        methodName: "GetBlockByTxID",
        params: [this.fabricChannelName, response.data.transactionId],
      } as FabricRunTransactionRequest);

      this.log.warn(receiptCreate.data);
      fabricCreateAssetProof = JSON.stringify(receiptCreate.data);
    }

    sessionData.rollbackActionsPerformed.push(
      SessionDataRollbackActionsPerformedEnum.Create,
    );

    sessionData.rollbackProofs.push(fabricCreateAssetProof);

    this.sessions.set(sessionID, sessionData);

    this.log.info(
      `${fnTag}, proof of the asset creation: ${fabricCreateAssetProof}`,
    );

    await this.storeProof({
      sessionID: sessionID,
      type: "proof-rollback",
      operation: "create",
      data: fabricCreateAssetProof,
    });

    await this.storeLog({
      sessionID: sessionID,
      type: "done-rollback",
      operation: "create-asset",
      data: JSON.stringify(sessionData),
    });

    return fabricCreateAssetProof;
  }

  async deleteAssetToRollback(
    sessionID: string,
    assetID?: string,
  ): Promise<string> {
    // not implemented. We assume the agreement was reached after the final interactions in each ledger
    // (delete in the source chain and create in the side chain)
    return `not implemented: ${sessionID}, ${assetID}`;
  }

  async rollback(sessionID: string): Promise<void> {
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
      this.fabricApi == undefined ||
      this.fabricContractName == undefined ||
      this.fabricChannelName == undefined ||
      this.fabricSigningCredential == undefined ||
      sessionData.sourceLedgerAssetID == undefined ||
      sessionData.recipientLedgerAssetID == undefined
    ) {
      return;
    }

    if (this.isClientGateway(sessionID)) {
      if (await this.fabricAssetExists(sessionData.sourceLedgerAssetID)) {
        if (await this.isFabricAssetLocked(sessionData.sourceLedgerAssetID)) {
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
  public async fabricAssetExists(
    fabricAssetID: string,
  ): Promise<boolean | undefined> {
    const fnTag = `${this.className}#fabricAssetExists()`;

    if (
      this.fabricContractName == undefined ||
      this.fabricChannelName == undefined ||
      this.fabricSigningCredential == undefined
    ) {
      throw new Error(`${fnTag} fabric config is not defined`);
    }

    const assetExists = await this.fabricApi?.runTransactionV1({
      contractName: this.fabricContractName,
      channelName: this.fabricChannelName,
      params: [fabricAssetID],
      methodName: "AssetReferenceExists",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    if (assetExists == undefined) {
      throw new Error(`${fnTag} the asset does not exist`);
    }

    return assetExists?.data.functionOutput == "true";
  }

  public async isFabricAssetLocked(
    fabricAssetID: string,
  ): Promise<boolean | undefined> {
    const fnTag = `${this.className}#isFabricAssetLocked()`;

    if (
      this.fabricContractName == undefined ||
      this.fabricChannelName == undefined ||
      this.fabricSigningCredential == undefined
    ) {
      throw new Error(`${fnTag} fabric config is not defined`);
    }

    const assetIsLocked = await this.fabricApi?.runTransactionV1({
      contractName: this.fabricContractName,
      channelName: this.fabricChannelName,
      params: [fabricAssetID],
      methodName: "IsAssetReferenceLocked",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: this.fabricSigningCredential,
    });

    if (assetIsLocked == undefined) {
      throw new Error(`${fnTag} the asset does not exist`);
    }

    return assetIsLocked?.data.functionOutput == "true";
  }
}
