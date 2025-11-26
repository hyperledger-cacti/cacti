// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_past_logs_v1_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_evm_log_pb_pb from "../models/evm_log_pb_pb";

export class GetPastLogsV1ResponsePB extends jspb.Message { 
    clearLogsList(): void;
    getLogsList(): Array<models_evm_log_pb_pb.EvmLogPB>;
    setLogsList(value: Array<models_evm_log_pb_pb.EvmLogPB>): GetPastLogsV1ResponsePB;
    addLogs(value?: models_evm_log_pb_pb.EvmLogPB, index?: number): models_evm_log_pb_pb.EvmLogPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPastLogsV1ResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: GetPastLogsV1ResponsePB): GetPastLogsV1ResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPastLogsV1ResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPastLogsV1ResponsePB;
    static deserializeBinaryFromReader(message: GetPastLogsV1ResponsePB, reader: jspb.BinaryReader): GetPastLogsV1ResponsePB;
}

export namespace GetPastLogsV1ResponsePB {
    export type AsObject = {
        logsList: Array<models_evm_log_pb_pb.EvmLogPB.AsObject>,
    }
}
