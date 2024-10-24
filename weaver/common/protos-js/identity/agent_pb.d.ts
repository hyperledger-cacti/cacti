// package: identity.agent
// file: identity/agent.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_ack_pb from "../common/ack_pb";

export class SecurityDomainMemberIdentity extends jspb.Message { 
    getSecurityDomain(): string;
    setSecurityDomain(value: string): SecurityDomainMemberIdentity;
    getMemberId(): string;
    setMemberId(value: string): SecurityDomainMemberIdentity;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecurityDomainMemberIdentity.AsObject;
    static toObject(includeInstance: boolean, msg: SecurityDomainMemberIdentity): SecurityDomainMemberIdentity.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecurityDomainMemberIdentity, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecurityDomainMemberIdentity;
    static deserializeBinaryFromReader(message: SecurityDomainMemberIdentity, reader: jspb.BinaryReader): SecurityDomainMemberIdentity;
}

export namespace SecurityDomainMemberIdentity {
    export type AsObject = {
        securityDomain: string,
        memberId: string,
    }
}

export class SecurityDomainMemberIdentityRequest extends jspb.Message { 

    hasSourceNetwork(): boolean;
    clearSourceNetwork(): void;
    getSourceNetwork(): SecurityDomainMemberIdentity | undefined;
    setSourceNetwork(value?: SecurityDomainMemberIdentity): SecurityDomainMemberIdentityRequest;

    hasRequestingNetwork(): boolean;
    clearRequestingNetwork(): void;
    getRequestingNetwork(): SecurityDomainMemberIdentity | undefined;
    setRequestingNetwork(value?: SecurityDomainMemberIdentity): SecurityDomainMemberIdentityRequest;
    getNonce(): string;
    setNonce(value: string): SecurityDomainMemberIdentityRequest;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SecurityDomainMemberIdentityRequest.AsObject;
    static toObject(includeInstance: boolean, msg: SecurityDomainMemberIdentityRequest): SecurityDomainMemberIdentityRequest.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SecurityDomainMemberIdentityRequest, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SecurityDomainMemberIdentityRequest;
    static deserializeBinaryFromReader(message: SecurityDomainMemberIdentityRequest, reader: jspb.BinaryReader): SecurityDomainMemberIdentityRequest;
}

export namespace SecurityDomainMemberIdentityRequest {
    export type AsObject = {
        sourceNetwork?: SecurityDomainMemberIdentity.AsObject,
        requestingNetwork?: SecurityDomainMemberIdentity.AsObject,
        nonce: string,
    }
}

export class Attestation extends jspb.Message { 

    hasUnitIdentity(): boolean;
    clearUnitIdentity(): void;
    getUnitIdentity(): SecurityDomainMemberIdentity | undefined;
    setUnitIdentity(value?: SecurityDomainMemberIdentity): Attestation;
    getCertificate(): string;
    setCertificate(value: string): Attestation;
    getSignature(): string;
    setSignature(value: string): Attestation;
    getNonce(): string;
    setNonce(value: string): Attestation;
    getTimestamp(): number;
    setTimestamp(value: number): Attestation;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Attestation.AsObject;
    static toObject(includeInstance: boolean, msg: Attestation): Attestation.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Attestation, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Attestation;
    static deserializeBinaryFromReader(message: Attestation, reader: jspb.BinaryReader): Attestation;
}

export namespace Attestation {
    export type AsObject = {
        unitIdentity?: SecurityDomainMemberIdentity.AsObject,
        certificate: string,
        signature: string,
        nonce: string,
        timestamp: number,
    }
}

export class AttestedMembership extends jspb.Message { 

    hasMembership(): boolean;
    clearMembership(): void;
    getMembership(): string;
    setMembership(value: string): AttestedMembership;

    hasError(): boolean;
    clearError(): void;
    getError(): string;
    setError(value: string): AttestedMembership;

    hasAttestation(): boolean;
    clearAttestation(): void;
    getAttestation(): Attestation | undefined;
    setAttestation(value?: Attestation): AttestedMembership;

    getResponseCase(): AttestedMembership.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AttestedMembership.AsObject;
    static toObject(includeInstance: boolean, msg: AttestedMembership): AttestedMembership.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AttestedMembership, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AttestedMembership;
    static deserializeBinaryFromReader(message: AttestedMembership, reader: jspb.BinaryReader): AttestedMembership;
}

export namespace AttestedMembership {
    export type AsObject = {
        membership: string,
        error: string,
        attestation?: Attestation.AsObject,
    }

    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        MEMBERSHIP = 1,
        ERROR = 2,
    }

}

export class CounterAttestedMembership extends jspb.Message { 

    hasAttestedMembershipSet(): boolean;
    clearAttestedMembershipSet(): void;
    getAttestedMembershipSet(): string;
    setAttestedMembershipSet(value: string): CounterAttestedMembership;

    hasError(): boolean;
    clearError(): void;
    getError(): string;
    setError(value: string): CounterAttestedMembership;
    clearAttestationsList(): void;
    getAttestationsList(): Array<Attestation>;
    setAttestationsList(value: Array<Attestation>): CounterAttestedMembership;
    addAttestations(value?: Attestation, index?: number): Attestation;

    getResponseCase(): CounterAttestedMembership.ResponseCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CounterAttestedMembership.AsObject;
    static toObject(includeInstance: boolean, msg: CounterAttestedMembership): CounterAttestedMembership.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CounterAttestedMembership, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CounterAttestedMembership;
    static deserializeBinaryFromReader(message: CounterAttestedMembership, reader: jspb.BinaryReader): CounterAttestedMembership;
}

export namespace CounterAttestedMembership {
    export type AsObject = {
        attestedMembershipSet: string,
        error: string,
        attestationsList: Array<Attestation.AsObject>,
    }


    export class AttestedMembershipSet extends jspb.Message { 
        getMembership(): string;
        setMembership(value: string): AttestedMembershipSet;
        clearAttestationsList(): void;
        getAttestationsList(): Array<Attestation>;
        setAttestationsList(value: Array<Attestation>): AttestedMembershipSet;
        addAttestations(value?: Attestation, index?: number): Attestation;

        serializeBinary(): Uint8Array;
        toObject(includeInstance?: boolean): AttestedMembershipSet.AsObject;
        static toObject(includeInstance: boolean, msg: AttestedMembershipSet): AttestedMembershipSet.AsObject;
        static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
        static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
        static serializeBinaryToWriter(message: AttestedMembershipSet, writer: jspb.BinaryWriter): void;
        static deserializeBinary(bytes: Uint8Array): AttestedMembershipSet;
        static deserializeBinaryFromReader(message: AttestedMembershipSet, reader: jspb.BinaryReader): AttestedMembershipSet;
    }

    export namespace AttestedMembershipSet {
        export type AsObject = {
            membership: string,
            attestationsList: Array<Attestation.AsObject>,
        }
    }


    export enum ResponseCase {
        RESPONSE_NOT_SET = 0,
        ATTESTED_MEMBERSHIP_SET = 1,
        ERROR = 2,
    }

}
