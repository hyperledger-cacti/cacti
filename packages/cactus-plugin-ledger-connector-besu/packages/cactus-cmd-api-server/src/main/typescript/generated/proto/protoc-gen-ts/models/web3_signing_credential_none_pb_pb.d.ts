// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_signing_credential_none_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_signing_credential_type_pb_pb from "../models/web3_signing_credential_type_pb_pb";

export class Web3SigningCredentialNonePB extends jspb.Message { 
    getType(): models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB;
    setType(value: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB): Web3SigningCredentialNonePB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3SigningCredentialNonePB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3SigningCredentialNonePB): Web3SigningCredentialNonePB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3SigningCredentialNonePB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3SigningCredentialNonePB;
    static deserializeBinaryFromReader(message: Web3SigningCredentialNonePB, reader: jspb.BinaryReader): Web3SigningCredentialNonePB;
}

export namespace Web3SigningCredentialNonePB {
    export type AsObject = {
        type: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB,
    }
}
