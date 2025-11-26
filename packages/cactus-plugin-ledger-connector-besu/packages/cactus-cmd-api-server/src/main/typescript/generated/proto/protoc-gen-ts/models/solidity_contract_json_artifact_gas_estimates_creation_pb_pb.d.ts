// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/solidity_contract_json_artifact_gas_estimates_creation_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";

export class SolidityContractJsonArtifactGasEstimatesCreationPB extends jspb.Message { 
    getCodedepositcost(): string;
    setCodedepositcost(value: string): SolidityContractJsonArtifactGasEstimatesCreationPB;
    getExecutioncost(): string;
    setExecutioncost(value: string): SolidityContractJsonArtifactGasEstimatesCreationPB;
    getTotalcost(): string;
    setTotalcost(value: string): SolidityContractJsonArtifactGasEstimatesCreationPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SolidityContractJsonArtifactGasEstimatesCreationPB.AsObject;
    static toObject(includeInstance: boolean, msg: SolidityContractJsonArtifactGasEstimatesCreationPB): SolidityContractJsonArtifactGasEstimatesCreationPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SolidityContractJsonArtifactGasEstimatesCreationPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SolidityContractJsonArtifactGasEstimatesCreationPB;
    static deserializeBinaryFromReader(message: SolidityContractJsonArtifactGasEstimatesCreationPB, reader: jspb.BinaryReader): SolidityContractJsonArtifactGasEstimatesCreationPB;
}

export namespace SolidityContractJsonArtifactGasEstimatesCreationPB {
    export type AsObject = {
        codedepositcost: string,
        executioncost: string,
        totalcost: string,
    }
}
