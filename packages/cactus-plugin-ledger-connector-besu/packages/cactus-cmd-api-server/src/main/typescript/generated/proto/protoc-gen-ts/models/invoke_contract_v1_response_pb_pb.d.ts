// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/invoke_contract_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_transaction_receipt_pb_pb from "../models/web3_transaction_receipt_pb_pb";

export class InvokeContractV1ResponsePB extends jspb.Message { 

    hasTransactionreceipt(): boolean;
    clearTransactionreceipt(): void;
    getTransactionreceipt(): models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB | undefined;
    setTransactionreceipt(value?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB): InvokeContractV1ResponsePB;

    hasCalloutput(): boolean;
    clearCalloutput(): void;
    getCalloutput(): google_protobuf_any_pb.Any | undefined;
    setCalloutput(value?: google_protobuf_any_pb.Any): InvokeContractV1ResponsePB;
    getSuccess(): boolean;
    setSuccess(value: boolean): InvokeContractV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InvokeContractV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: InvokeContractV1ResponsePB): InvokeContractV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InvokeContractV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InvokeContractV1ResponsePB;
    static deserializeBinaryFromReader(message: InvokeContractV1ResponsePB, reader: jspb.BinaryReader): InvokeContractV1ResponsePB;
}

export namespace InvokeContractV1ResponsePB {
    export type AsObject = {
        transactionreceipt?: models_web3_transaction_receipt_pb_pb.Web3TransactionReceiptPB.AsObject,
        calloutput?: google_protobuf_any_pb.Any.AsObject,
        success: boolean,
    }
}
