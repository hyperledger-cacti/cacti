// package: common.proofs
// file: common/proofs.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Proof extends jspb.Message { 
    getSignature(): string;
    setSignature(value: string): Proof;
    getCertificate(): string;
    setCertificate(value: string): Proof;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Proof.AsObject;
    static toObject(includeInstance: boolean, msg: Proof): Proof.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Proof, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Proof;
    static deserializeBinaryFromReader(message: Proof, reader: jspb.BinaryReader): Proof;
}

export namespace Proof {
    export type AsObject = {
        signature: string,
        certificate: string,
    }
}

export class Proofs extends jspb.Message { 
    clearProofsList(): void;
    getProofsList(): Array<Proof>;
    setProofsList(value: Array<Proof>): Proofs;
    addProofs(value?: Proof, index?: number): Proof;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Proofs.AsObject;
    static toObject(includeInstance: boolean, msg: Proofs): Proofs.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Proofs, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Proofs;
    static deserializeBinaryFromReader(message: Proofs, reader: jspb.BinaryReader): Proofs;
}

export namespace Proofs {
    export type AsObject = {
        proofsList: Array<Proof.AsObject>,
    }
}
