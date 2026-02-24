// package: org.hyperledger.cactus.cmd_api_server
// file: models/cmd_api_server_endpoint_error_response_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class CmdApiServerEndpointErrorResponsePB extends jspb.Message { 
    getMessage(): string;
    setMessage(value: string): CmdApiServerEndpointErrorResponsePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CmdApiServerEndpointErrorResponsePB.AsObject;
    static toObject(includeInstance: boolean, msg: CmdApiServerEndpointErrorResponsePB): CmdApiServerEndpointErrorResponsePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CmdApiServerEndpointErrorResponsePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CmdApiServerEndpointErrorResponsePB;
    static deserializeBinaryFromReader(message: CmdApiServerEndpointErrorResponsePB, reader: jspb.BinaryReader): CmdApiServerEndpointErrorResponsePB;
}

export namespace CmdApiServerEndpointErrorResponsePB {
    export type AsObject = {
        message: string,
    }
}
