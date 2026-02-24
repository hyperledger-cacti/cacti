// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/web3_signing_credential_private_key_hex_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_web3_signing_credential_type_pb_pb from "../models/web3_signing_credential_type_pb_pb";

export class Web3SigningCredentialPrivateKeyHexPB extends jspb.Message { 
    getType(): models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB;
    setType(value: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB): Web3SigningCredentialPrivateKeyHexPB;
    getEthaccount(): string;
    setEthaccount(value: string): Web3SigningCredentialPrivateKeyHexPB;
    getSecret(): string;
    setSecret(value: string): Web3SigningCredentialPrivateKeyHexPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Web3SigningCredentialPrivateKeyHexPB.AsObject;
    static toObject(includeInstance: boolean, msg: Web3SigningCredentialPrivateKeyHexPB): Web3SigningCredentialPrivateKeyHexPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Web3SigningCredentialPrivateKeyHexPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Web3SigningCredentialPrivateKeyHexPB;
    static deserializeBinaryFromReader(message: Web3SigningCredentialPrivateKeyHexPB, reader: jspb.BinaryReader): Web3SigningCredentialPrivateKeyHexPB;
}

export namespace Web3SigningCredentialPrivateKeyHexPB {
    export type AsObject = {
        type: models_web3_signing_credential_type_pb_pb.Web3SigningCredentialTypePB,
        ethaccount: string,
        secret: string,
    }
}
