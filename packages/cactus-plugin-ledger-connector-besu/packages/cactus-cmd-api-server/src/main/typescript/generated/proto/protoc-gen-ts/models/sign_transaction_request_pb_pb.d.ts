// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/sign_transaction_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class SignTransactionRequestPB extends jspb.Message { 
    getKeychainid(): string;
    setKeychainid(value: string): SignTransactionRequestPB;
    getKeychainref(): string;
    setKeychainref(value: string): SignTransactionRequestPB;
    getTransactionhash(): string;
    setTransactionhash(value: string): SignTransactionRequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignTransactionRequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: SignTransactionRequestPB): SignTransactionRequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignTransactionRequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignTransactionRequestPB;
    static deserializeBinaryFromReader(message: SignTransactionRequestPB, reader: jspb.BinaryReader): SignTransactionRequestPB;
}

export namespace SignTransactionRequestPB {
    export type AsObject = {
        keychainid: string,
        keychainref: string,
        transactionhash: string,
    }
}
