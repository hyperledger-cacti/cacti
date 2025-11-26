// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_besu_record_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_invoke_contract_v1_request_pb_pb from "../models/invoke_contract_v1_request_pb_pb";

export class GetBesuRecordV1RequestPB extends jspb.Message { 

    hasInvokecall(): boolean;
    clearInvokecall(): void;
    getInvokecall(): models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB | undefined;
    setInvokecall(value?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB): GetBesuRecordV1RequestPB;
    getTransactionhash(): string;
    setTransactionhash(value: string): GetBesuRecordV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBesuRecordV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBesuRecordV1RequestPB): GetBesuRecordV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBesuRecordV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBesuRecordV1RequestPB;
    static deserializeBinaryFromReader(message: GetBesuRecordV1RequestPB, reader: jspb.BinaryReader): GetBesuRecordV1RequestPB;
}

export namespace GetBesuRecordV1RequestPB {
    export type AsObject = {
        invokecall?: models_invoke_contract_v1_request_pb_pb.InvokeContractV1RequestPB.AsObject,
        transactionhash: string,
    }
}
