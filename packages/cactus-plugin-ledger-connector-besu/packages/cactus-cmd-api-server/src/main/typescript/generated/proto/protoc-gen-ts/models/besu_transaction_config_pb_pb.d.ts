// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/besu_transaction_config_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_besu_transaction_config_to_pb_pb from "../models/besu_transaction_config_to_pb_pb";
import * as models_web3_block_header_timestamp_pb_pb from "../models/web3_block_header_timestamp_pb_pb";

export class BesuTransactionConfigPB extends jspb.Message { 
    getRawtransaction(): string;
    setRawtransaction(value: string): BesuTransactionConfigPB;

    hasFrom(): boolean;
    clearFrom(): void;
    getFrom(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setFrom(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): BesuTransactionConfigPB;

    hasTo(): boolean;
    clearTo(): void;
    getTo(): models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB | undefined;
    setTo(value?: models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB): BesuTransactionConfigPB;

    hasValue(): boolean;
    clearValue(): void;
    getValue(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setValue(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): BesuTransactionConfigPB;

    hasGas(): boolean;
    clearGas(): void;
    getGas(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setGas(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): BesuTransactionConfigPB;

    hasGasprice(): boolean;
    clearGasprice(): void;
    getGasprice(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setGasprice(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): BesuTransactionConfigPB;
    getNonce(): number;
    setNonce(value: number): BesuTransactionConfigPB;

    hasData(): boolean;
    clearData(): void;
    getData(): models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB | undefined;
    setData(value?: models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB): BesuTransactionConfigPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BesuTransactionConfigPB.AsObject;
    static toObject(includeInstance: boolean, msg: BesuTransactionConfigPB): BesuTransactionConfigPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BesuTransactionConfigPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BesuTransactionConfigPB;
    static deserializeBinaryFromReader(message: BesuTransactionConfigPB, reader: jspb.BinaryReader): BesuTransactionConfigPB;
}

export namespace BesuTransactionConfigPB {
    export type AsObject = {
        rawtransaction: string,
        from?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        to?: models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB.AsObject,
        value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        gas?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        gasprice?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        nonce: number,
        data?: models_besu_transaction_config_to_pb_pb.BesuTransactionConfigToPB.AsObject,
    }
}
