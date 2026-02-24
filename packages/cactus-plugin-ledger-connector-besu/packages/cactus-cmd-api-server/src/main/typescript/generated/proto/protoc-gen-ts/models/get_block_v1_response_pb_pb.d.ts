// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_block_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_evm_block_pb_pb from "../models/evm_block_pb_pb";

export class GetBlockV1ResponsePB extends jspb.Message { 

    hasBlock(): boolean;
    clearBlock(): void;
    getBlock(): models_evm_block_pb_pb.EvmBlockPB | undefined;
    setBlock(value?: models_evm_block_pb_pb.EvmBlockPB): GetBlockV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBlockV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBlockV1ResponsePB): GetBlockV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBlockV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBlockV1ResponsePB;
    static deserializeBinaryFromReader(message: GetBlockV1ResponsePB, reader: jspb.BinaryReader): GetBlockV1ResponsePB;
}

export namespace GetBlockV1ResponsePB {
    export type AsObject = {
        block?: models_evm_block_pb_pb.EvmBlockPB.AsObject,
    }
}
