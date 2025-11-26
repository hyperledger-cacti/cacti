// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/solidity_contract_json_artifact_gas_estimates_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_solidity_contract_json_artifact_gas_estimates_creation_pb_pb from "../models/solidity_contract_json_artifact_gas_estimates_creation_pb_pb";

export class SolidityContractJsonArtifactGasEstimatesPB extends jspb.Message { 

    hasCreation(): boolean;
    clearCreation(): void;
    getCreation(): models_solidity_contract_json_artifact_gas_estimates_creation_pb_pb.SolidityContractJsonArtifactGasEstimatesCreationPB | undefined;
    setCreation(value?: models_solidity_contract_json_artifact_gas_estimates_creation_pb_pb.SolidityContractJsonArtifactGasEstimatesCreationPB): SolidityContractJsonArtifactGasEstimatesPB;

    getExternalMap(): jspb.Map<string, google_protobuf_any_pb.Any>;
    clearExternalMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SolidityContractJsonArtifactGasEstimatesPB.AsObject;
    static toObject(includeInstance: boolean, msg: SolidityContractJsonArtifactGasEstimatesPB): SolidityContractJsonArtifactGasEstimatesPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SolidityContractJsonArtifactGasEstimatesPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SolidityContractJsonArtifactGasEstimatesPB;
    static deserializeBinaryFromReader(message: SolidityContractJsonArtifactGasEstimatesPB, reader: jspb.BinaryReader): SolidityContractJsonArtifactGasEstimatesPB;
}

export namespace SolidityContractJsonArtifactGasEstimatesPB {
    export type AsObject = {
        creation?: models_solidity_contract_json_artifact_gas_estimates_creation_pb_pb.SolidityContractJsonArtifactGasEstimatesCreationPB.AsObject,

        externalMap: Array<[string, google_protobuf_any_pb.Any.AsObject]>,
    }
}
