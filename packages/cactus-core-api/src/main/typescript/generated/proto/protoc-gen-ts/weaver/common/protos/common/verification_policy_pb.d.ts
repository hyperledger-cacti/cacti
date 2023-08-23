// package: common.verification_policy
// file: common/verification_policy.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class VerificationPolicy extends jspb.Message { 
    getSecuritydomain(): string;
    setSecuritydomain(value: string): VerificationPolicy;
    clearIdentifiersList(): void;
    getIdentifiersList(): Array<Identifier>;
    setIdentifiersList(value: Array<Identifier>): VerificationPolicy;
    addIdentifiers(value?: Identifier, index?: number): Identifier;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): VerificationPolicy.AsObject;
    static toObject(includeInstance: boolean, msg: VerificationPolicy): VerificationPolicy.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: VerificationPolicy, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): VerificationPolicy;
    static deserializeBinaryFromReader(message: VerificationPolicy, reader: jspb.BinaryReader): VerificationPolicy;
}

export namespace VerificationPolicy {
    export type AsObject = {
        securitydomain: string,
        identifiersList: Array<Identifier.AsObject>,
    }
}

export class Policy extends jspb.Message { 
    getType(): string;
    setType(value: string): Policy;
    clearCriteriaList(): void;
    getCriteriaList(): Array<string>;
    setCriteriaList(value: Array<string>): Policy;
    addCriteria(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Policy.AsObject;
    static toObject(includeInstance: boolean, msg: Policy): Policy.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Policy, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Policy;
    static deserializeBinaryFromReader(message: Policy, reader: jspb.BinaryReader): Policy;
}

export namespace Policy {
    export type AsObject = {
        type: string,
        criteriaList: Array<string>,
    }
}

export class Identifier extends jspb.Message { 
    getPattern(): string;
    setPattern(value: string): Identifier;

    hasPolicy(): boolean;
    clearPolicy(): void;
    getPolicy(): Policy | undefined;
    setPolicy(value?: Policy): Identifier;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Identifier.AsObject;
    static toObject(includeInstance: boolean, msg: Identifier): Identifier.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Identifier, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Identifier;
    static deserializeBinaryFromReader(message: Identifier, reader: jspb.BinaryReader): Identifier;
}

export namespace Identifier {
    export type AsObject = {
        pattern: string,
        policy?: Policy.AsObject,
    }
}
