// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_besu_record_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetBesuRecordV1ResponsePB extends jspb.Message { 
    getLedgerid(): string;
    setLedgerid(value: string): GetBesuRecordV1ResponsePB;
    getStatecontract(): string;
    setStatecontract(value: string): GetBesuRecordV1ResponsePB;

    hasTransactioninputdata(): boolean;
    clearTransactioninputdata(): void;
    getTransactioninputdata(): google_protobuf_any_pb.Any | undefined;
    setTransactioninputdata(value?: google_protobuf_any_pb.Any): GetBesuRecordV1ResponsePB;

    hasCalloutput(): boolean;
    clearCalloutput(): void;
    getCalloutput(): google_protobuf_any_pb.Any | undefined;
    setCalloutput(value?: google_protobuf_any_pb.Any): GetBesuRecordV1ResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetBesuRecordV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: GetBesuRecordV1ResponsePB): GetBesuRecordV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetBesuRecordV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetBesuRecordV1ResponsePB;
    static deserializeBinaryFromReader(message: GetBesuRecordV1ResponsePB, reader: jspb.BinaryReader): GetBesuRecordV1ResponsePB;
}

export namespace GetBesuRecordV1ResponsePB {
    export type AsObject = {
        ledgerid: string,
        statecontract: string,
        transactioninputdata?: google_protobuf_any_pb.Any.AsObject,
        calloutput?: google_protobuf_any_pb.Any.AsObject,
    }
}
