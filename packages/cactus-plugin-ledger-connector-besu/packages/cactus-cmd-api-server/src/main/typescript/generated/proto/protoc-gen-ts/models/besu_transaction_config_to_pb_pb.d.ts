// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/besu_transaction_config_to_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class BesuTransactionConfigToPB extends jspb.Message { 

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BesuTransactionConfigToPB.AsObject;
    static toObject(includeInstance: boolean, msg: BesuTransactionConfigToPB): BesuTransactionConfigToPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BesuTransactionConfigToPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BesuTransactionConfigToPB;
    static deserializeBinaryFromReader(message: BesuTransactionConfigToPB, reader: jspb.BinaryReader): BesuTransactionConfigToPB;
}

export namespace BesuTransactionConfigToPB {
    export type AsObject = {
    }
}
