// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_transaction_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_evm_transaction_pb_pb from "../models/evm_transaction_pb_pb";

export class GetTransactionV1ResponsePB extends jspb.Message { 

    hasTransaction(): boolean;
    clearTransaction(): void;
    getTransaction(): models_evm_transaction_pb_pb.EvmTransactionPB | undefined;
    setTransaction(value?: models_evm_transaction_pb_pb.EvmTransactionPB): GetTransactionV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetTransactionV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: GetTransactionV1ResponsePB): GetTransactionV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetTransactionV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetTransactionV1ResponsePB;
    static deserializeBinaryFromReader(message: GetTransactionV1ResponsePB, reader: jspb.BinaryReader): GetTransactionV1ResponsePB;
}

export namespace GetTransactionV1ResponsePB {
    export type AsObject = {
        transaction?: models_evm_transaction_pb_pb.EvmTransactionPB.AsObject,
    }
}
