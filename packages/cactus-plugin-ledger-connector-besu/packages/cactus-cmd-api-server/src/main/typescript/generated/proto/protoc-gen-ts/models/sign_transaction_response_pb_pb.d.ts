// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/sign_transaction_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class SignTransactionResponsePB extends jspb.Message { 
    getSignature(): string;
    setSignature(value: string): SignTransactionResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SignTransactionResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: SignTransactionResponsePB): SignTransactionResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SignTransactionResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SignTransactionResponsePB;
    static deserializeBinaryFromReader(message: SignTransactionResponsePB, reader: jspb.BinaryReader): SignTransactionResponsePB;
}

export namespace SignTransactionResponsePB {
    export type AsObject = {
        signature: string,
    }
}
