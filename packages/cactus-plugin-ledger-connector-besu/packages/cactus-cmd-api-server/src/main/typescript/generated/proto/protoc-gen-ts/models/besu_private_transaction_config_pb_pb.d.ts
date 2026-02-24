// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/besu_private_transaction_config_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class BesuPrivateTransactionConfigPB extends jspb.Message { 
    getPrivatefrom(): string;
    setPrivatefrom(value: string): BesuPrivateTransactionConfigPB;
    clearPrivateforList(): void;
    getPrivateforList(): Array<google_protobuf_any_pb.Any>;
    setPrivateforList(value: Array<google_protobuf_any_pb.Any>): BesuPrivateTransactionConfigPB;
    addPrivatefor(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): BesuPrivateTransactionConfigPB.AsObject;
    static toObject(includeInstance: boolean, msg: BesuPrivateTransactionConfigPB): BesuPrivateTransactionConfigPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: BesuPrivateTransactionConfigPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): BesuPrivateTransactionConfigPB;
    static deserializeBinaryFromReader(message: BesuPrivateTransactionConfigPB, reader: jspb.BinaryReader): BesuPrivateTransactionConfigPB;
}

export namespace BesuPrivateTransactionConfigPB {
    export type AsObject = {
        privatefrom: string,
        privateforList: Array<google_protobuf_any_pb.Any.AsObject>,
    }
}
