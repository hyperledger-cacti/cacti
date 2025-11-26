// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_balance_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetBalanceV1ResponsePB extends jspb.Message { 
    getBalance(): string;
    setBalance(value: string): GetBalanceV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBalanceV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBalanceV1ResponsePB): GetBalanceV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBalanceV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBalanceV1ResponsePB;
    static deserializeBinaryFromReader(message: GetBalanceV1ResponsePB, reader: jspb.BinaryReader): GetBalanceV1ResponsePB;
}

export namespace GetBalanceV1ResponsePB {
    export type AsObject = {
        balance: string,
    }
}
