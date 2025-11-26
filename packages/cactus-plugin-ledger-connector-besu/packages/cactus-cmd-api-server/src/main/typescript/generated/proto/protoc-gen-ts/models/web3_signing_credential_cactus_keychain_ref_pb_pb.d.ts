// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_signing_credential_cactus_keychain_ref_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_signing_credential_type_pb_pb from "../models/web3_signing_credential_type_pb_pb";

export class Web3SigningCredentialCactusKeychainRefPB extends jspb.Message { 
    getType(): models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB;
    setType(value: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB): Web3SigningCredentialCactusKeychainRefPB;
    getEthaccount(): string;
    setEthaccount(value: string): Web3SigningCredentialCactusKeychainRefPB;
    getKeychainentrykey(): string;
    setKeychainentrykey(value: string): Web3SigningCredentialCactusKeychainRefPB;
    getKeychainid(): string;
    setKeychainid(value: string): Web3SigningCredentialCactusKeychainRefPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3SigningCredentialCactusKeychainRefPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3SigningCredentialCactusKeychainRefPB): Web3SigningCredentialCactusKeychainRefPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3SigningCredentialCactusKeychainRefPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3SigningCredentialCactusKeychainRefPB;
    static deserializeBinaryFromReader(message: Web3SigningCredentialCactusKeychainRefPB, reader: jspb.BinaryReader): Web3SigningCredentialCactusKeychainRefPB;
}

export namespace Web3SigningCredentialCactusKeychainRefPB {
    export type AsObject = {
        type: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB,
        ethaccount: string,
        keychainentrykey: string,
        keychainid: string,
    }
}
