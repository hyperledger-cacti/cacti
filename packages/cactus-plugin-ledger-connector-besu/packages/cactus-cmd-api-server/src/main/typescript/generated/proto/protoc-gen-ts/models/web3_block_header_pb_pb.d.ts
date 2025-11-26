// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_block_header_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_block_header_timestamp_pb_pb from "../models/web3_block_header_timestamp_pb_pb";

export class Web3BlockHeaderPB extends jspb.Message { 
    getNumber(): number;
    setNumber(value: number): Web3BlockHeaderPB;
    getHash(): string;
    setHash(value: string): Web3BlockHeaderPB;
    getParenthash(): string;
    setParenthash(value: string): Web3BlockHeaderPB;
    getNonce(): string;
    setNonce(value: string): Web3BlockHeaderPB;
    getSha3uncles(): string;
    setSha3uncles(value: string): Web3BlockHeaderPB;
    getLogsbloom(): string;
    setLogsbloom(value: string): Web3BlockHeaderPB;
    getTransactionroot(): string;
    setTransactionroot(value: string): Web3BlockHeaderPB;
    getStateroot(): string;
    setStateroot(value: string): Web3BlockHeaderPB;
    getReceiptroot(): string;
    setReceiptroot(value: string): Web3BlockHeaderPB;
    getMiner(): string;
    setMiner(value: string): Web3BlockHeaderPB;
    getExtradata(): string;
    setExtradata(value: string): Web3BlockHeaderPB;
    getGaslimit(): number;
    setGaslimit(value: number): Web3BlockHeaderPB;
    getGasused(): number;
    setGasused(value: number): Web3BlockHeaderPB;

    hasTimestamp(): boolean;
    clearTimestamp(): void;
    getTimestamp(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setTimestamp(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): Web3BlockHeaderPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3BlockHeaderPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3BlockHeaderPB): Web3BlockHeaderPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3BlockHeaderPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3BlockHeaderPB;
    static deserializeBinaryFromReader(message: Web3BlockHeaderPB, reader: jspb.BinaryReader): Web3BlockHeaderPB;
}

export namespace Web3BlockHeaderPB {
    export type AsObject = {
        number: number,
        hash: string,
        parenthash: string,
        nonce: string,
        sha3uncles: string,
        logsbloom: string,
        transactionroot: string,
        stateroot: string,
        receiptroot: string,
        miner: string,
        extradata: string,
        gaslimit: number,
        gasused: number,
        timestamp?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
    }
}
