// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_signing_credential_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_signing_credential_cactus_keychain_ref_pb_pb from "../models/web3_signing_credential_cactus_keychain_ref_pb_pb";
import * as models_web3_signing_credential_none_pb_pb from "../models/web3_signing_credential_none_pb_pb";
import * as models_web3_signing_credential_private_key_hex_pb_pb from "../models/web3_signing_credential_private_key_hex_pb_pb";
import * as models_web3_signing_credential_type_pb_pb from "../models/web3_signing_credential_type_pb_pb";

export class Web3SigningCredentialPB extends jspb.Message { 
    getType(): models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB;
    setType(value: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB): Web3SigningCredentialPB;
    getEthaccount(): string;
    setEthaccount(value: string): Web3SigningCredentialPB;
    getKeychainentrykey(): string;
    setKeychainentrykey(value: string): Web3SigningCredentialPB;
    getKeychainid(): string;
    setKeychainid(value: string): Web3SigningCredentialPB;
    getSecret(): string;
    setSecret(value: string): Web3SigningCredentialPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3SigningCredentialPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3SigningCredentialPB): Web3SigningCredentialPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3SigningCredentialPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3SigningCredentialPB;
    static deserializeBinaryFromReader(message: Web3SigningCredentialPB, reader: jspb.BinaryReader): Web3SigningCredentialPB;
}

export namespace Web3SigningCredentialPB {
    export type AsObject = {
        type: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB,
        ethaccount: string,
        keychainentrykey: string,
        keychainid: string,
        secret: string,
    }
}
