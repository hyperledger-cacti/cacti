// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/backing_ledger_unavailable_error_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class BackingLedgerUnavailableErrorPB extends jspb.Message { 
    getMessage(): string;
    setMessage(value: string): BackingLedgerUnavailableErrorPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BackingLedgerUnavailableErrorPB.AsObject;
    static toObject(includeInstance: boolean, msg: BackingLedgerUnavailableErrorPB): BackingLedgerUnavailableErrorPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BackingLedgerUnavailableErrorPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BackingLedgerUnavailableErrorPB;
    static deserializeBinaryFromReader(message: BackingLedgerUnavailableErrorPB, reader: jspb.BinaryReader): BackingLedgerUnavailableErrorPB;
}

export namespace BackingLedgerUnavailableErrorPB {
    export type AsObject = {
        message: string,
    }
}
