// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_transaction_receipt_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class Web3TransactionReceiptPB extends jspb.Message { 
    getStatus(): boolean;
    setStatus(value: boolean): Web3TransactionReceiptPB;
    getTransactionhash(): string;
    setTransactionhash(value: string): Web3TransactionReceiptPB;
    getTransactionindex(): number;
    setTransactionindex(value: number): Web3TransactionReceiptPB;
    getBlockhash(): string;
    setBlockhash(value: string): Web3TransactionReceiptPB;
    getBlocknumber(): number;
    setBlocknumber(value: number): Web3TransactionReceiptPB;
    getGasused(): number;
    setGasused(value: number): Web3TransactionReceiptPB;

    hasContractaddress(): boolean;
    clearContractaddress(): void;
    getContractaddress(): string | undefined;
    setContractaddress(value: string): Web3TransactionReceiptPB;
    getFrom(): string;
    setFrom(value: string): Web3TransactionReceiptPB;
    getTo(): string;
    setTo(value: string): Web3TransactionReceiptPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3TransactionReceiptPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3TransactionReceiptPB): Web3TransactionReceiptPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3TransactionReceiptPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3TransactionReceiptPB;
    static deserializeBinaryFromReader(message: Web3TransactionReceiptPB, reader: jspb.BinaryReader): Web3TransactionReceiptPB;
}

export namespace Web3TransactionReceiptPB {
    export type AsObject = {
        status: boolean,
        transactionhash: string,
        transactionindex: number,
        blockhash: string,
        blocknumber: number,
        gasused: number,
        contractaddress?: string,
        from: string,
        to: string,
    }
}
