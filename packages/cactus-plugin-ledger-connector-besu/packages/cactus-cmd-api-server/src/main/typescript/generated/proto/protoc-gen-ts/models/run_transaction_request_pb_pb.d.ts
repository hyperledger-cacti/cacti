// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/run_transaction_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_besu_private_transaction_config_pb_pb from "../models/besu_private_transaction_config_pb_pb";
import * as models_besu_transaction_config_pb_pb from "../models/besu_transaction_config_pb_pb";
import * as models_consistency_strategy_pb_pb from "../models/consistency_strategy_pb_pb";
import * as models_web3_signing_credential_pb_pb from "../models/web3_signing_credential_pb_pb";

export class RunTransactionRequestPB extends jspb.Message { 

    hasWeb3signingcredential(): boolean;
    clearWeb3signingcredential(): void;
    getWeb3signingcredential(): models_web3_signing_credential_pb_pb.Web3SigningCredentialPB | undefined;
    setWeb3signingcredential(value?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB): RunTransactionRequestPB;

    hasTransactionconfig(): boolean;
    clearTransactionconfig(): void;
    getTransactionconfig(): models_besu_transaction_config_pb_pb.BesuTransactionConfigPB | undefined;
    setTransactionconfig(value?: models_besu_transaction_config_pb_pb.BesuTransactionConfigPB): RunTransactionRequestPB;

    hasConsistencystrategy(): boolean;
    clearConsistencystrategy(): void;
    getConsistencystrategy(): models_consistency_strategy_pb_pb.ConsistencyStrategyPB | undefined;
    setConsistencystrategy(value?: models_consistency_strategy_pb_pb.ConsistencyStrategyPB): RunTransactionRequestPB;

    hasPrivatetransactionconfig(): boolean;
    clearPrivatetransactionconfig(): void;
    getPrivatetransactionconfig(): models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB | undefined;
    setPrivatetransactionconfig(value?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB): RunTransactionRequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunTransactionRequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: RunTransactionRequestPB): RunTransactionRequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunTransactionRequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunTransactionRequestPB;
    static deserializeBinaryFromReader(message: RunTransactionRequestPB, reader: jspb.BinaryReader): RunTransactionRequestPB;
}

export namespace RunTransactionRequestPB {
    export type AsObject = {
        web3signingcredential?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB.AsObject,
        transactionconfig?: models_besu_transaction_config_pb_pb.BesuTransactionConfigPB.AsObject,
        consistencystrategy?: models_consistency_strategy_pb_pb.ConsistencyStrategyPB.AsObject,
        privatetransactionconfig?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB.AsObject,
    }
}
