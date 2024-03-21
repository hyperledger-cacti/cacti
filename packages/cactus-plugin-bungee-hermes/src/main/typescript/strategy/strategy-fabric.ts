import {
  FabricSigningCredential,
  DefaultApi as FabricApi,
  Configuration,
  FabricContractInvocationType,
  RunTransactionRequest,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import { NetworkDetails, ObtainLedgerStrategy } from "./obtain-ledger-strategy";
import {
  LogLevelDesc,
  Logger,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import { Transaction } from "../view-creation/transaction";
import { State } from "../view-creation/state";
import { StateProof } from "../view-creation/state-proof";
import { Proof } from "../view-creation/proof";
import { TransactionProof } from "../view-creation/transaction-proof";

export interface FabricNetworkDetails extends NetworkDetails {
  signingCredential: FabricSigningCredential;
  contractName: string;
  channelName: string;
}
export class StrategyFabric implements ObtainLedgerStrategy {
  public static readonly CLASS_NAME = "StrategyFabric";

  public log: Logger;

  constructor(level: LogLevelDesc) {
    this.log = LoggerProvider.getOrCreate({
      label: StrategyFabric.CLASS_NAME,
      level,
    });
  }

  public async generateLedgerStates(
    stateIds: string[],
    networkDetails: FabricNetworkDetails,
  ): Promise<Map<string, State>> {
    this.log.info(`Generating ledger snapshot`);

    const config = new Configuration({
      basePath: networkDetails.connectorApiPath,
    });
    const fabricApi = new FabricApi(config);

    const assetsKey =
      stateIds.length == 0
        ? (await this.getAllAssetsKey(fabricApi, networkDetails)).split(",")
        : stateIds;
    const ledgerStates = new Map<string, State>();
    //For each key in ledgerAssetsKey
    for (const assetKey of assetsKey) {
      const assetValues: string[] = [];
      const txWithTimeS: Transaction[] = [];

      const txs = await this.getAllTxByKey(assetKey, fabricApi, networkDetails);
      //For each tx get receipt
      for (const tx of txs) {
        const receipt = JSON.parse(
          await this.fabricGetTxReceiptByTxIDV1(
            tx.getId(),
            fabricApi,
            networkDetails,
          ),
        );

        assetValues.push(JSON.parse(receipt.rwsetWriteData).Value.toString());
        tx.setStateId(assetKey);
        //tx.setPayload(); //FIXME check what to assign here
        //tx.setTarget();

        for (const endorsement of receipt.transactionEndorsement) {
          const signature64 = Buffer.from(endorsement.signature).toString(
            "base64",
          );
          tx.addEndorser(
            new Proof({
              mspid: endorsement.mspid,
              creator: endorsement.endorserID,
              signature: signature64,
            }),
          );
        }
        txWithTimeS.push(tx);
      }
      const block = await this.fabricGetBlockByTxID(
        txs[txs.length - 1].getId(),
        fabricApi,
        networkDetails,
      );

      const state = new State(assetKey, assetValues, txWithTimeS);
      ledgerStates.set(assetKey, state);
      const stateProof = new StateProof(
        state.getValue(),
        parseInt(state.getVersion()),
        state.getId(),
      );
      //only adding last block for each state, in the state proof
      stateProof.addBlock({
        blockHash: block.hash,
        blockCreator: "",
        blockSigners: block.signers,
      });
    }
    return ledgerStates;
  }

  async fabricGetTxReceiptByTxIDV1(
    transactionId: string,
    api: FabricApi,
    networkDetails: FabricNetworkDetails,
  ): Promise<string> {
    const receiptLockRes = await api.getTransactionReceiptByTxIDV1({
      signingCredential: networkDetails.signingCredential,
      channelName: networkDetails.channelName,
      contractName: "qscc",
      invocationType: FabricContractInvocationType.Call,
      methodName: "GetBlockByTxID",
      params: [networkDetails.channelName, transactionId],
    } as RunTransactionRequest);
    return JSON.stringify(receiptLockRes?.data);
  }

  async fabricGetBlockByTxID(
    txId: string,
    api: FabricApi,
    netwokDetails: FabricNetworkDetails,
  ): Promise<{ hash: string; signers: string[] }> {
    const gatewayOptions = {
      identity: netwokDetails.signingCredential.keychainRef,
      wallet: {
        keychain: {
          keychainId: netwokDetails.signingCredential.keychainId,
          keychainRef: netwokDetails.signingCredential.keychainRef,
        },
      },
    };
    const getBlockReq = {
      channelName: netwokDetails.channelName as string,
      gatewayOptions,
      query: {
        transactionId: txId,
      },
      skipDecode: false,
    };

    const getBlockResponse = await api.getBlockV1(getBlockReq);

    const block = JSON.parse(
      JSON.stringify(getBlockResponse?.data),
    ).decodedBlock;

    const blockSig = block.metadata.metadata[0].signatures;
    const sigs = [];
    for (const sig of blockSig) {
      sigs.push(JSON.stringify(sig));
    }

    return {
      hash: Buffer.from(block.header.data_hash.data).toString("hex"),
      signers: sigs,
    };
  }

  async getAllAssetsKey(
    api: FabricApi,
    netwokDetails: FabricNetworkDetails,
  ): Promise<string> {
    const response = await api.runTransactionV1({
      signingCredential: netwokDetails.signingCredential,
      channelName: netwokDetails.channelName,
      contractName: netwokDetails.contractName,
      methodName: "GetAllAssetsKey",
      invocationType: FabricContractInvocationType.Call,
      params: [],
    } as RunTransactionRequest);

    if (response != undefined) {
      return response.data.functionOutput;
    }

    return "response undefined";
  }

  async getAllTxByKey(
    key: string,
    api: FabricApi,
    netwokDetails: FabricNetworkDetails,
  ): Promise<Transaction[]> {
    const response = await api.runTransactionV1({
      signingCredential: netwokDetails.signingCredential,
      channelName: netwokDetails.channelName,
      contractName: netwokDetails.contractName,
      methodName: "GetAllTxByKey",
      invocationType: FabricContractInvocationType.Call,
      params: [key],
    } as RunTransactionRequest);

    if (response != undefined) {
      return this.txsStringToTxs(response.data.functionOutput);
    }

    return [];
  }

  // Receive transactions in string format and parses to Transaction []
  txsStringToTxs(txString: string): Transaction[] {
    const transactions: Transaction[] = [];
    const txs = JSON.parse(txString);
    for (const tx of txs) {
      const txId = tx.value.txId;
      const ts = tx.value.timestamp.seconds;
      transactions.push(
        new Transaction(
          txId,
          ts,
          new TransactionProof(new Proof({ creator: "" })),
        ),
      );
    }
    return transactions.reverse();
  }
}
