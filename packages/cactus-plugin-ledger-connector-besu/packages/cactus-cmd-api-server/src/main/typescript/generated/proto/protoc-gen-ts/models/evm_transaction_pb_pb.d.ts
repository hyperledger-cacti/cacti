// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/evm_transaction_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class EvmTransactionPB extends jspb.Message { 
    getHash(): string;
    setHash(value: string): EvmTransactionPB;
    getNonce(): number;
    setNonce(value: number): EvmTransactionPB;

    hasBlockhash(): boolean;
    clearBlockhash(): void;
    getBlockhash(): google_protobuf_any_pb.Any | undefined;
    setBlockhash(value?: google_protobuf_any_pb.Any): EvmTransactionPB;

    hasBlocknumber(): boolean;
    clearBlocknumber(): void;
    getBlocknumber(): google_protobuf_any_pb.Any | undefined;
    setBlocknumber(value?: google_protobuf_any_pb.Any): EvmTransactionPB;

    hasTransactionindex(): boolean;
    clearTransactionindex(): void;
    getTransactionindex(): google_protobuf_any_pb.Any | undefined;
    setTransactionindex(value?: google_protobuf_any_pb.Any): EvmTransactionPB;
    getFrom(): string;
    setFrom(value: string): EvmTransactionPB;

    hasTo(): boolean;
    clearTo(): void;
    getTo(): google_protobuf_any_pb.Any | undefined;
    setTo(value?: google_protobuf_any_pb.Any): EvmTransactionPB;
    getValue(): string;
    setValue(value: string): EvmTransactionPB;
    getGasprice(): string;
    setGasprice(value: string): EvmTransactionPB;
    getGas(): number;
    setGas(value: number): EvmTransactionPB;
    getInput(): string;
    setInput(value: string): EvmTransactionPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): EvmTransactionPB.AsObject;
    static toObject(includeInstance: boolean, msg: EvmTransactionPB): EvmTransactionPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: EvmTransactionPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): EvmTransactionPB;
    static deserializeBinaryFromReader(message: EvmTransactionPB, reader: jspb.BinaryReader): EvmTransactionPB;
}

export namespace EvmTransactionPB {
    export type AsObject = {
        hash: string,
        nonce: number,
        blockhash?: google_protobuf_any_pb.Any.AsObject,
        blocknumber?: google_protobuf_any_pb.Any.AsObject,
        transactionindex?: google_protobuf_any_pb.Any.AsObject,
        from: string,
        to?: google_protobuf_any_pb.Any.AsObject,
        value: string,
        gasprice: string,
        gas: number,
        input: string,
    }
}
