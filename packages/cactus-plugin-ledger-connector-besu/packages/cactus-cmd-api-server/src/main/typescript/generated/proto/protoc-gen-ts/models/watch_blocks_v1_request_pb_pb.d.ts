// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/watch_blocks_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_watch_blocks_v1_pb_pb from "../models/watch_blocks_v1_pb_pb";

export class WatchBlocksV1RequestPB extends jspb.Message { 
    getEvent(): models_watch_blocks_v1_pb_pb.WatchBlocksV1PB;
    setEvent(value: models_watch_blocks_v1_pb_pb.WatchBlocksV1PB): WatchBlocksV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): WatchBlocksV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: WatchBlocksV1RequestPB): WatchBlocksV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: WatchBlocksV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): WatchBlocksV1RequestPB;
    static deserializeBinaryFromReader(message: WatchBlocksV1RequestPB, reader: jspb.BinaryReader): WatchBlocksV1RequestPB;
}

export namespace WatchBlocksV1RequestPB {
    export type AsObject = {
        event: models_watch_blocks_v1_pb_pb.WatchBlocksV1PB,
    }
}
