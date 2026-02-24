// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/run_transaction_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_transaction_receipt_pb_pb from "../models/web3_transaction_receipt_pb_pb";

export class RunTransactionResponsePB extends jspb.Message { 

    hasTransactionreceipt(): boolean;
    clearTransactionreceipt(): void;
    getTransactionreceipt(): models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB | undefined;
    setTransactionreceipt(value?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB): RunTransactionResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): RunTransactionResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: RunTransactionResponsePB): RunTransactionResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: RunTransactionResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): RunTransactionResponsePB;
    static deserializeBinaryFromReader(message: RunTransactionResponsePB, reader: jspb.BinaryReader): RunTransactionResponsePB;
}

export namespace RunTransactionResponsePB {
    export type AsObject = {
        transactionreceipt?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB.AsObject,
    }
}
