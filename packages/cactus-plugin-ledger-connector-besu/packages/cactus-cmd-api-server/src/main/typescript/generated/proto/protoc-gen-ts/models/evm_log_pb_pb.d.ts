// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/evm_log_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class EvmLogPB extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): EvmLogPB;
    getData(): string;
    setData(value: string): EvmLogPB;
    getBlockhash(): string;
    setBlockhash(value: string): EvmLogPB;
    getTransactionhash(): string;
    setTransactionhash(value: string): EvmLogPB;
    clearTopicsList(): void;
    getTopicsList(): Array<string>;
    setTopicsList(value: Array<string>): EvmLogPB;
    addTopics(value: string, index?: number): string;
    getLogindex(): number;
    setLogindex(value: number): EvmLogPB;
    getTransactionindex(): number;
    setTransactionindex(value: number): EvmLogPB;
    getBlocknumber(): number;
    setBlocknumber(value: number): EvmLogPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EvmLogPB.AsObject;
    static toObject(includeInstance: boolean, msg: EvmLogPB): EvmLogPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EvmLogPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EvmLogPB;
    static deserializeBinaryFromReader(message: EvmLogPB, reader: jspb.BinaryReader): EvmLogPB;
}

export namespace EvmLogPB {
    export type AsObject = {
        address: string,
        data: string,
        blockhash: string,
        transactionhash: string,
        topicsList: Array<string>,
        logindex: number,
        transactionindex: number,
        blocknumber: number,
    }
}
