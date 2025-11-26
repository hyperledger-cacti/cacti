// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_block_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetBlockV1RequestPB extends jspb.Message { 

    hasBlockhashorblocknumber(): boolean;
    clearBlockhashorblocknumber(): void;
    getBlockhashorblocknumber(): google_protobuf_any_pb.Any | undefined;
    setBlockhashorblocknumber(value?: google_protobuf_any_pb.Any): GetBlockV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockV1RequestPB): GetBlockV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockV1RequestPB;
    static deserializeBinaryFromReader(message: GetBlockV1RequestPB, reader: jspb.BinaryReader): GetBlockV1RequestPB;
}

export namespace GetBlockV1RequestPB {
    export type AsObject = {
        blockhashorblocknumber?: google_protobuf_any_pb.Any.AsObject,
    }
}
