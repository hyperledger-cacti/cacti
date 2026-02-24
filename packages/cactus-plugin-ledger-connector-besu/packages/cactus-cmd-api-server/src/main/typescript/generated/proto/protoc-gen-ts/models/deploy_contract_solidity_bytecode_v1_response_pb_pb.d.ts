// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/deploy_contract_solidity_bytecode_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_transaction_receipt_pb_pb from "../models/web3_transaction_receipt_pb_pb";

export class DeployContractSolidityBytecodeV1ResponsePB extends jspb.Message { 

    hasTransactionreceipt(): boolean;
    clearTransactionreceipt(): void;
    getTransactionreceipt(): models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB | undefined;
    setTransactionreceipt(value?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB): DeployContractSolidityBytecodeV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolidityBytecodeV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolidityBytecodeV1ResponsePB): DeployContractSolidityBytecodeV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolidityBytecodeV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolidityBytecodeV1ResponsePB;
    static deserializeBinaryFromReader(message: DeployContractSolidityBytecodeV1ResponsePB, reader: jspb.BinaryReader): DeployContractSolidityBytecodeV1ResponsePB;
}

export namespace DeployContractSolidityBytecodeV1ResponsePB {
    export type AsObject = {
        transactionreceipt?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB.AsObject,
    }
}
