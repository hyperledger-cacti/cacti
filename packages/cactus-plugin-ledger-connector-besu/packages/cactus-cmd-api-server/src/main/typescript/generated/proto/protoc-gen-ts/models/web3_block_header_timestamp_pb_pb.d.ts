// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_block_header_timestamp_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class Web3BlockHeaderTimestampPB extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3BlockHeaderTimestampPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3BlockHeaderTimestampPB): Web3BlockHeaderTimestampPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3BlockHeaderTimestampPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3BlockHeaderTimestampPB;
    static deserializeBinaryFromReader(message: Web3BlockHeaderTimestampPB, reader: jspb.BinaryReader): Web3BlockHeaderTimestampPB;
}

export namespace Web3BlockHeaderTimestampPB {
    export type AsObject = {
    }
}
