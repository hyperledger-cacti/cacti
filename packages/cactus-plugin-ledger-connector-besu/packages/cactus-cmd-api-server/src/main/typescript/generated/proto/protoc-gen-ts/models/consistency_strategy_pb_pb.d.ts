// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/consistency_strategy_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_receipt_type_pb_pb from "../models/receipt_type_pb_pb";

export class ConsistencyStrategyPB extends jspb.Message { 
    getReceipttype(): models_receipt_type_pb_pb.ReceiptTypePB;
    setReceipttype(value: models_receipt_type_pb_pb.ReceiptTypePB): ConsistencyStrategyPB;
    getTimeoutms(): number;
    setTimeoutms(value: number): ConsistencyStrategyPB;
    getBlockconfirmations(): number;
    setBlockconfirmations(value: number): ConsistencyStrategyPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ConsistencyStrategyPB.AsObject;
    static toObject(includeInstance: boolean, msg: ConsistencyStrategyPB): ConsistencyStrategyPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ConsistencyStrategyPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ConsistencyStrategyPB;
    static deserializeBinaryFromReader(message: ConsistencyStrategyPB, reader: jspb.BinaryReader): ConsistencyStrategyPB;
}

export namespace ConsistencyStrategyPB {
    export type AsObject = {
        receipttype: models_receipt_type_pb_pb.ReceiptTypePB,
        timeoutms: number,
        blockconfirmations: number,
    }
}
