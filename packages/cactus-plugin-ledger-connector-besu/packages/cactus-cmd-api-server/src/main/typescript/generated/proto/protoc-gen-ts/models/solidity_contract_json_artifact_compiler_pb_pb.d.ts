// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/solidity_contract_json_artifact_compiler_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class SolidityContractJsonArtifactCompilerPB extends jspb.Message { 
    getName(): string;
    setName(value: string): SolidityContractJsonArtifactCompilerPB;
    getVersion(): string;
    setVersion(value: string): SolidityContractJsonArtifactCompilerPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SolidityContractJsonArtifactCompilerPB.AsObject;
    static toObject(includeInstance: boolean, msg: SolidityContractJsonArtifactCompilerPB): SolidityContractJsonArtifactCompilerPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SolidityContractJsonArtifactCompilerPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SolidityContractJsonArtifactCompilerPB;
    static deserializeBinaryFromReader(message: SolidityContractJsonArtifactCompilerPB, reader: jspb.BinaryReader): SolidityContractJsonArtifactCompilerPB;
}

export namespace SolidityContractJsonArtifactCompilerPB {
    export type AsObject = {
        name: string,
        version: string,
    }
}
