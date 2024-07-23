// package: common
// file: msp/msp_principal.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class MSPPrincipal extends jspb.Message { 
    getPrincipalClassification(): MSPPrincipal.Classification;
    setPrincipalClassification(value: MSPPrincipal.Classification): MSPPrincipal;
    getPrincipal(): Uint8Array | string;
    getPrincipal_asU8(): Uint8Array;
    getPrincipal_asB64(): string;
    setPrincipal(value: Uint8Array | string): MSPPrincipal;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MSPPrincipal.AsObject;
    static toObject(includeInstance: boolean, msg: MSPPrincipal): MSPPrincipal.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MSPPrincipal, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MSPPrincipal;
    static deserializeBinaryFromReader(message: MSPPrincipal, reader: jspb.BinaryReader): MSPPrincipal;
}

export namespace MSPPrincipal {
    export type AsObject = {
        principalClassification: MSPPrincipal.Classification,
        principal: Uint8Array | string,
    }

    export enum Classification {
    ROLE = 0,
    ORGANIZATION_UNIT = 1,
    IDENTITY = 2,
    ANONYMITY = 3,
    COMBINED = 4,
    }

}

export class OrganizationUnit extends jspb.Message { 
    getMspIdentifier(): string;
    setMspIdentifier(value: string): OrganizationUnit;
    getOrganizationalUnitIdentifier(): string;
    setOrganizationalUnitIdentifier(value: string): OrganizationUnit;
    getCertifiersIdentifier(): Uint8Array | string;
    getCertifiersIdentifier_asU8(): Uint8Array;
    getCertifiersIdentifier_asB64(): string;
    setCertifiersIdentifier(value: Uint8Array | string): OrganizationUnit;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): OrganizationUnit.AsObject;
    static toObject(includeInstance: boolean, msg: OrganizationUnit): OrganizationUnit.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: OrganizationUnit, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): OrganizationUnit;
    static deserializeBinaryFromReader(message: OrganizationUnit, reader: jspb.BinaryReader): OrganizationUnit;
}

export namespace OrganizationUnit {
    export type AsObject = {
        mspIdentifier: string,
        organizationalUnitIdentifier: string,
        certifiersIdentifier: Uint8Array | string,
    }
}

export class MSPRole extends jspb.Message { 
    getMspIdentifier(): string;
    setMspIdentifier(value: string): MSPRole;
    getRole(): MSPRole.MSPRoleType;
    setRole(value: MSPRole.MSPRoleType): MSPRole;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MSPRole.AsObject;
    static toObject(includeInstance: boolean, msg: MSPRole): MSPRole.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MSPRole, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MSPRole;
    static deserializeBinaryFromReader(message: MSPRole, reader: jspb.BinaryReader): MSPRole;
}

export namespace MSPRole {
    export type AsObject = {
        mspIdentifier: string,
        role: MSPRole.MSPRoleType,
    }

    export enum MSPRoleType {
    MEMBER = 0,
    ADMIN = 1,
    CLIENT = 2,
    PEER = 3,
    ORDERER = 4,
    }

}

export class MSPIdentityAnonymity extends jspb.Message { 
    getAnonymityType(): MSPIdentityAnonymity.MSPIdentityAnonymityType;
    setAnonymityType(value: MSPIdentityAnonymity.MSPIdentityAnonymityType): MSPIdentityAnonymity;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): MSPIdentityAnonymity.AsObject;
    static toObject(includeInstance: boolean, msg: MSPIdentityAnonymity): MSPIdentityAnonymity.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: MSPIdentityAnonymity, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): MSPIdentityAnonymity;
    static deserializeBinaryFromReader(message: MSPIdentityAnonymity, reader: jspb.BinaryReader): MSPIdentityAnonymity;
}

export namespace MSPIdentityAnonymity {
    export type AsObject = {
        anonymityType: MSPIdentityAnonymity.MSPIdentityAnonymityType,
    }

    export enum MSPIdentityAnonymityType {
    NOMINAL = 0,
    ANONYMOUS = 1,
    }

}

export class CombinedPrincipal extends jspb.Message { 
    clearPrincipalsList(): void;
    getPrincipalsList(): Array<MSPPrincipal>;
    setPrincipalsList(value: Array<MSPPrincipal>): CombinedPrincipal;
    addPrincipals(value?: MSPPrincipal, index?: number): MSPPrincipal;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CombinedPrincipal.AsObject;
    static toObject(includeInstance: boolean, msg: CombinedPrincipal): CombinedPrincipal.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CombinedPrincipal, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CombinedPrincipal;
    static deserializeBinaryFromReader(message: CombinedPrincipal, reader: jspb.BinaryReader): CombinedPrincipal;
}

export namespace CombinedPrincipal {
    export type AsObject = {
        principalsList: Array<MSPPrincipal.AsObject>,
    }
}
