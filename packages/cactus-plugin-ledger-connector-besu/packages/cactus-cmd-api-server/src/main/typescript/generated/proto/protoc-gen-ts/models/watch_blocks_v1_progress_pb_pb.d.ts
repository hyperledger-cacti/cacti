// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/watch_blocks_v1_progress_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_block_header_pb_pb from "../models/web3_block_header_pb_pb";

export class WatchBlocksV1ProgressPB extends jspb.Message { 

    hasBlockheader(): boolean;
    clearBlockheader(): void;
    getBlockheader(): models_web3_block_header_pb_pb.Web3BlockHeaderPB | undefined;
    setBlockheader(value?: models_web3_block_header_pb_pb.Web3BlockHeaderPB): WatchBlocksV1ProgressPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WatchBlocksV1ProgressPB.AsObject;
    static toObject(includeInstance: boolean, msg: WatchBlocksV1ProgressPB): WatchBlocksV1ProgressPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WatchBlocksV1ProgressPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WatchBlocksV1ProgressPB;
    static deserializeBinaryFromReader(message: WatchBlocksV1ProgressPB, reader: jspb.BinaryReader): WatchBlocksV1ProgressPB;
}

export namespace WatchBlocksV1ProgressPB {
    export type AsObject = {
        blockheader?: models_web3_block_header_pb_pb.Web3BlockHeaderPB.AsObject,
    }
}
