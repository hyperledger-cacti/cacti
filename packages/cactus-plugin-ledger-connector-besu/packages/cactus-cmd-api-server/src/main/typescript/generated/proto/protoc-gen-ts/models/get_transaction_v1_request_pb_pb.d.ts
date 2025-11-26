// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_transaction_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetTransactionV1RequestPB extends jspb.Message { 
    getTransactionhash(): string;
    setTransactionhash(value: string): GetTransactionV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetTransactionV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: GetTransactionV1RequestPB): GetTransactionV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetTransactionV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetTransactionV1RequestPB;
    static deserializeBinaryFromReader(message: GetTransactionV1RequestPB, reader: jspb.BinaryReader): GetTransactionV1RequestPB;
}

export namespace GetTransactionV1RequestPB {
    export type AsObject = {
        transactionhash: string,
    }
}
