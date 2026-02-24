// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_balance_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetBalanceV1RequestPB extends jspb.Message { 
    getAddress(): string;
    setAddress(value: string): GetBalanceV1RequestPB;

    hasDefaultblock(): boolean;
    clearDefaultblock(): void;
    getDefaultblock(): google_protobuf_any_pb.Any | undefined;
    setDefaultblock(value?: google_protobuf_any_pb.Any): GetBalanceV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBalanceV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBalanceV1RequestPB): GetBalanceV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBalanceV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBalanceV1RequestPB;
    static deserializeBinaryFromReader(message: GetBalanceV1RequestPB, reader: jspb.BinaryReader): GetBalanceV1RequestPB;
}

export namespace GetBalanceV1RequestPB {
    export type AsObject = {
        address: string,
        defaultblock?: google_protobuf_any_pb.Any.AsObject,
    }
}
