// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/evm_block_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class EvmBlockPB extends jspb.Message { 
    getNumber(): number;
    setNumber(value: number): EvmBlockPB;
    getHash(): string;
    setHash(value: string): EvmBlockPB;
    getParenthash(): string;
    setParenthash(value: string): EvmBlockPB;
    getNonce(): string;
    setNonce(value: string): EvmBlockPB;
    getSha3uncles(): string;
    setSha3uncles(value: string): EvmBlockPB;
    getLogsbloom(): string;
    setLogsbloom(value: string): EvmBlockPB;
    getTransactionsroot(): string;
    setTransactionsroot(value: string): EvmBlockPB;
    getStateroot(): string;
    setStateroot(value: string): EvmBlockPB;
    getMiner(): string;
    setMiner(value: string): EvmBlockPB;
    getDifficulty(): number;
    setDifficulty(value: number): EvmBlockPB;
    getTotaldifficulty(): number;
    setTotaldifficulty(value: number): EvmBlockPB;
    getExtradata(): string;
    setExtradata(value: string): EvmBlockPB;
    getSize(): number;
    setSize(value: number): EvmBlockPB;
    getGaslimit(): number;
    setGaslimit(value: number): EvmBlockPB;
    getGasused(): number;
    setGasused(value: number): EvmBlockPB;

    hasTimestamp(): boolean;
    clearTimestamp(): void;
    getTimestamp(): google_protobuf_any_pb.Any | undefined;
    setTimestamp(value?: google_protobuf_any_pb.Any): EvmBlockPB;
    clearTransactionsList(): void;
    getTransactionsList(): Array<google_protobuf_any_pb.Any>;
    setTransactionsList(value: Array<google_protobuf_any_pb.Any>): EvmBlockPB;
    addTransactions(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;
    clearUnclesList(): void;
    getUnclesList(): Array<google_protobuf_any_pb.Any>;
    setUnclesList(value: Array<google_protobuf_any_pb.Any>): EvmBlockPB;
    addUncles(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EvmBlockPB.AsObject;
    static toObject(includeInstance: boolean, msg: EvmBlockPB): EvmBlockPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EvmBlockPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EvmBlockPB;
    static deserializeBinaryFromReader(message: EvmBlockPB, reader: jspb.BinaryReader): EvmBlockPB;
}

export namespace EvmBlockPB {
    export type AsObject = {
        number: number,
        hash: string,
        parenthash: string,
        nonce: string,
        sha3uncles: string,
        logsbloom: string,
        transactionsroot: string,
        stateroot: string,
        miner: string,
        difficulty: number,
        totaldifficulty: number,
        extradata: string,
        size: number,
        gaslimit: number,
        gasused: number,
        timestamp?: google_protobuf_any_pb.Any.AsObject,
        transactionsList: Array<google_protobuf_any_pb.Any.AsObject>,
        unclesList: Array<google_protobuf_any_pb.Any.AsObject>,
    }
}
