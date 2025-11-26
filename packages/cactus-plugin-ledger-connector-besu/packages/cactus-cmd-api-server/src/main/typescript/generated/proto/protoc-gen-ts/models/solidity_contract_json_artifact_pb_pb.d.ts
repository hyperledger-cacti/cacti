// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/solidity_contract_json_artifact_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_solidity_contract_json_artifact_compiler_pb_pb from "../models/solidity_contract_json_artifact_compiler_pb_pb";
import * as models_solidity_contract_json_artifact_gas_estimates_pb_pb from "../models/solidity_contract_json_artifact_gas_estimates_pb_pb";

export class SolidityContractJsonArtifactPB extends jspb.Message { 
    getContractname(): string;
    setContractname(value: string): SolidityContractJsonArtifactPB;
    getMetadata(): string;
    setMetadata(value: string): SolidityContractJsonArtifactPB;
    getBytecode(): string;
    setBytecode(value: string): SolidityContractJsonArtifactPB;
    getDeployedbytecode(): string;
    setDeployedbytecode(value: string): SolidityContractJsonArtifactPB;
    getSourcemap(): string;
    setSourcemap(value: string): SolidityContractJsonArtifactPB;
    getDeployedsourcemap(): string;
    setDeployedsourcemap(value: string): SolidityContractJsonArtifactPB;
    getSourcepath(): string;
    setSourcepath(value: string): SolidityContractJsonArtifactPB;

    hasCompiler(): boolean;
    clearCompiler(): void;
    getCompiler(): models_solidity_contract_json_artifact_compiler_pb_pb.SolidityContractJsonArtifactCompilerPB | undefined;
    setCompiler(value?: models_solidity_contract_json_artifact_compiler_pb_pb.SolidityContractJsonArtifactCompilerPB): SolidityContractJsonArtifactPB;

    getFunctionhashesMap(): jspb.Map<string, google_protobuf_any_pb.Any>;
    clearFunctionhashesMap(): void;

    hasGasestimates(): boolean;
    clearGasestimates(): void;
    getGasestimates(): models_solidity_contract_json_artifact_gas_estimates_pb_pb.SolidityContractJsonArtifactGasEstimatesPB | undefined;
    setGasestimates(value?: models_solidity_contract_json_artifact_gas_estimates_pb_pb.SolidityContractJsonArtifactGasEstimatesPB): SolidityContractJsonArtifactPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SolidityContractJsonArtifactPB.AsObject;
    static toObject(includeInstance: boolean, msg: SolidityContractJsonArtifactPB): SolidityContractJsonArtifactPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SolidityContractJsonArtifactPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SolidityContractJsonArtifactPB;
    static deserializeBinaryFromReader(message: SolidityContractJsonArtifactPB, reader: jspb.BinaryReader): SolidityContractJsonArtifactPB;
}

export namespace SolidityContractJsonArtifactPB {
    export type AsObject = {
        contractname: string,
        metadata: string,
        bytecode: string,
        deployedbytecode: string,
        sourcemap: string,
        deployedsourcemap: string,
        sourcepath: string,
        compiler?: models_solidity_contract_json_artifact_compiler_pb_pb.SolidityContractJsonArtifactCompilerPB.AsObject,

        functionhashesMap: Array<[string, google_protobuf_any_pb.Any.AsObject]>,
        gasestimates?: models_solidity_contract_json_artifact_gas_estimates_pb_pb.SolidityContractJsonArtifactGasEstimatesPB.AsObject,
    }
}
