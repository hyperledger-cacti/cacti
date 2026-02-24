// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/get_past_logs_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class GetPastLogsV1RequestPB extends jspb.Message { 

    hasToblock(): boolean;
    clearToblock(): void;
    getToblock(): google_protobuf_any_pb.Any | undefined;
    setToblock(value?: google_protobuf_any_pb.Any): GetPastLogsV1RequestPB;

    hasFromblock(): boolean;
    clearFromblock(): void;
    getFromblock(): google_protobuf_any_pb.Any | undefined;
    setFromblock(value?: google_protobuf_any_pb.Any): GetPastLogsV1RequestPB;

    hasAddress(): boolean;
    clearAddress(): void;
    getAddress(): google_protobuf_any_pb.Any | undefined;
    setAddress(value?: google_protobuf_any_pb.Any): GetPastLogsV1RequestPB;
    clearTopicsList(): void;
    getTopicsList(): Array<google_protobuf_any_pb.Any>;
    setTopicsList(value: Array<google_protobuf_any_pb.Any>): GetPastLogsV1RequestPB;
    addTopics(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): GetPastLogsV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: GetPastLogsV1RequestPB): GetPastLogsV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: GetPastLogsV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): GetPastLogsV1RequestPB;
    static deserializeBinaryFromReader(message: GetPastLogsV1RequestPB, reader: jspb.BinaryReader): GetPastLogsV1RequestPB;
}

export namespace GetPastLogsV1RequestPB {
    export type AsObject = {
        toblock?: google_protobuf_any_pb.Any.AsObject,
        fromblock?: google_protobuf_any_pb.Any.AsObject,
        address?: google_protobuf_any_pb.Any.AsObject,
        topicsList: Array<google_protobuf_any_pb.Any.AsObject>,
    }
}
