// package: common.asset_locks
// file: common/asset_locks.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AssetLock extends jspb.Message { 
    getLockmechanism(): LockMechanism;
    setLockmechanism(value: LockMechanism): AssetLock;
    getLockinfo(): Uint8Array | string;
    getLockinfo_asU8(): Uint8Array;
    getLockinfo_asB64(): string;
    setLockinfo(value: Uint8Array | string): AssetLock;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetLock.AsObject;
    static toObject(includeInstance: boolean, msg: AssetLock): AssetLock.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetLock, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetLock;
    static deserializeBinaryFromReader(message: AssetLock, reader: jspb.BinaryReader): AssetLock;
}

export namespace AssetLock {
    export type AsObject = {
        lockmechanism: LockMechanism,
        lockinfo: Uint8Array | string,
    }
}

export class AssetClaim extends jspb.Message { 
    getLockmechanism(): LockMechanism;
    setLockmechanism(value: LockMechanism): AssetClaim;
    getClaiminfo(): Uint8Array | string;
    getClaiminfo_asU8(): Uint8Array;
    getClaiminfo_asB64(): string;
    setClaiminfo(value: Uint8Array | string): AssetClaim;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetClaim.AsObject;
    static toObject(includeInstance: boolean, msg: AssetClaim): AssetClaim.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetClaim, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetClaim;
    static deserializeBinaryFromReader(message: AssetClaim, reader: jspb.BinaryReader): AssetClaim;
}

export namespace AssetClaim {
    export type AsObject = {
        lockmechanism: LockMechanism,
        claiminfo: Uint8Array | string,
    }
}

export class AssetLockHTLC extends jspb.Message { 
    getHashmechanism(): HashMechanism;
    setHashmechanism(value: HashMechanism): AssetLockHTLC;
    getHashbase64(): Uint8Array | string;
    getHashbase64_asU8(): Uint8Array;
    getHashbase64_asB64(): string;
    setHashbase64(value: Uint8Array | string): AssetLockHTLC;
    getExpirytimesecs(): number;
    setExpirytimesecs(value: number): AssetLockHTLC;
    getTimespec(): TimeSpec;
    setTimespec(value: TimeSpec): AssetLockHTLC;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetLockHTLC.AsObject;
    static toObject(includeInstance: boolean, msg: AssetLockHTLC): AssetLockHTLC.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetLockHTLC, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetLockHTLC;
    static deserializeBinaryFromReader(message: AssetLockHTLC, reader: jspb.BinaryReader): AssetLockHTLC;
}

export namespace AssetLockHTLC {
    export type AsObject = {
        hashmechanism: HashMechanism,
        hashbase64: Uint8Array | string,
        expirytimesecs: number,
        timespec: TimeSpec,
    }
}

export class AssetClaimHTLC extends jspb.Message { 
    getHashmechanism(): HashMechanism;
    setHashmechanism(value: HashMechanism): AssetClaimHTLC;
    getHashpreimagebase64(): Uint8Array | string;
    getHashpreimagebase64_asU8(): Uint8Array;
    getHashpreimagebase64_asB64(): string;
    setHashpreimagebase64(value: Uint8Array | string): AssetClaimHTLC;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetClaimHTLC.AsObject;
    static toObject(includeInstance: boolean, msg: AssetClaimHTLC): AssetClaimHTLC.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetClaimHTLC, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetClaimHTLC;
    static deserializeBinaryFromReader(message: AssetClaimHTLC, reader: jspb.BinaryReader): AssetClaimHTLC;
}

export namespace AssetClaimHTLC {
    export type AsObject = {
        hashmechanism: HashMechanism,
        hashpreimagebase64: Uint8Array | string,
    }
}

export class AssetExchangeAgreement extends jspb.Message { 
    getAssettype(): string;
    setAssettype(value: string): AssetExchangeAgreement;
    getId(): string;
    setId(value: string): AssetExchangeAgreement;
    getLocker(): string;
    setLocker(value: string): AssetExchangeAgreement;
    getRecipient(): string;
    setRecipient(value: string): AssetExchangeAgreement;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetExchangeAgreement.AsObject;
    static toObject(includeInstance: boolean, msg: AssetExchangeAgreement): AssetExchangeAgreement.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetExchangeAgreement, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetExchangeAgreement;
    static deserializeBinaryFromReader(message: AssetExchangeAgreement, reader: jspb.BinaryReader): AssetExchangeAgreement;
}

export namespace AssetExchangeAgreement {
    export type AsObject = {
        assettype: string,
        id: string,
        locker: string,
        recipient: string,
    }
}

export class HybridAssetExchangeAgreement extends jspb.Message { 
    getAssettype(): string;
    setAssettype(value: string): HybridAssetExchangeAgreement;
    getId(): string;
    setId(value: string): HybridAssetExchangeAgreement;
    getAssetdata(): Uint8Array | string;
    getAssetdata_asU8(): Uint8Array;
    getAssetdata_asB64(): string;
    setAssetdata(value: Uint8Array | string): HybridAssetExchangeAgreement;
    getNumunits(): number;
    setNumunits(value: number): HybridAssetExchangeAgreement;
    getLocker(): string;
    setLocker(value: string): HybridAssetExchangeAgreement;
    getRecipient(): string;
    setRecipient(value: string): HybridAssetExchangeAgreement;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): HybridAssetExchangeAgreement.AsObject;
    static toObject(includeInstance: boolean, msg: HybridAssetExchangeAgreement): HybridAssetExchangeAgreement.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: HybridAssetExchangeAgreement, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): HybridAssetExchangeAgreement;
    static deserializeBinaryFromReader(message: HybridAssetExchangeAgreement, reader: jspb.BinaryReader): HybridAssetExchangeAgreement;
}

export namespace HybridAssetExchangeAgreement {
    export type AsObject = {
        assettype: string,
        id: string,
        assetdata: Uint8Array | string,
        numunits: number,
        locker: string,
        recipient: string,
    }
}

export class FungibleAssetExchangeAgreement extends jspb.Message { 
    getAssettype(): string;
    setAssettype(value: string): FungibleAssetExchangeAgreement;
    getNumunits(): number;
    setNumunits(value: number): FungibleAssetExchangeAgreement;
    getLocker(): string;
    setLocker(value: string): FungibleAssetExchangeAgreement;
    getRecipient(): string;
    setRecipient(value: string): FungibleAssetExchangeAgreement;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): FungibleAssetExchangeAgreement.AsObject;
    static toObject(includeInstance: boolean, msg: FungibleAssetExchangeAgreement): FungibleAssetExchangeAgreement.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: FungibleAssetExchangeAgreement, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): FungibleAssetExchangeAgreement;
    static deserializeBinaryFromReader(message: FungibleAssetExchangeAgreement, reader: jspb.BinaryReader): FungibleAssetExchangeAgreement;
}

export namespace FungibleAssetExchangeAgreement {
    export type AsObject = {
        assettype: string,
        numunits: number,
        locker: string,
        recipient: string,
    }
}

export class AssetContractHTLC extends jspb.Message { 
    getContractid(): string;
    setContractid(value: string): AssetContractHTLC;

    hasAgreement(): boolean;
    clearAgreement(): void;
    getAgreement(): AssetExchangeAgreement | undefined;
    setAgreement(value?: AssetExchangeAgreement): AssetContractHTLC;

    hasLock(): boolean;
    clearLock(): void;
    getLock(): AssetLockHTLC | undefined;
    setLock(value?: AssetLockHTLC): AssetContractHTLC;

    hasClaim(): boolean;
    clearClaim(): void;
    getClaim(): AssetClaimHTLC | undefined;
    setClaim(value?: AssetClaimHTLC): AssetContractHTLC;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetContractHTLC.AsObject;
    static toObject(includeInstance: boolean, msg: AssetContractHTLC): AssetContractHTLC.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetContractHTLC, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetContractHTLC;
    static deserializeBinaryFromReader(message: AssetContractHTLC, reader: jspb.BinaryReader): AssetContractHTLC;
}

export namespace AssetContractHTLC {
    export type AsObject = {
        contractid: string,
        agreement?: AssetExchangeAgreement.AsObject,
        lock?: AssetLockHTLC.AsObject,
        claim?: AssetClaimHTLC.AsObject,
    }
}

export class FungibleAssetContractHTLC extends jspb.Message { 
    getContractid(): string;
    setContractid(value: string): FungibleAssetContractHTLC;

    hasAgreement(): boolean;
    clearAgreement(): void;
    getAgreement(): FungibleAssetExchangeAgreement | undefined;
    setAgreement(value?: FungibleAssetExchangeAgreement): FungibleAssetContractHTLC;

    hasLock(): boolean;
    clearLock(): void;
    getLock(): AssetLockHTLC | undefined;
    setLock(value?: AssetLockHTLC): FungibleAssetContractHTLC;

    hasClaim(): boolean;
    clearClaim(): void;
    getClaim(): AssetClaimHTLC | undefined;
    setClaim(value?: AssetClaimHTLC): FungibleAssetContractHTLC;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): FungibleAssetContractHTLC.AsObject;
    static toObject(includeInstance: boolean, msg: FungibleAssetContractHTLC): FungibleAssetContractHTLC.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: FungibleAssetContractHTLC, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): FungibleAssetContractHTLC;
    static deserializeBinaryFromReader(message: FungibleAssetContractHTLC, reader: jspb.BinaryReader): FungibleAssetContractHTLC;
}

export namespace FungibleAssetContractHTLC {
    export type AsObject = {
        contractid: string,
        agreement?: FungibleAssetExchangeAgreement.AsObject,
        lock?: AssetLockHTLC.AsObject,
        claim?: AssetClaimHTLC.AsObject,
    }
}

export enum LockMechanism {
    HTLC = 0,
}

export enum HashMechanism {
    SHA256 = 0,
    SHA512 = 1,
}

export enum TimeSpec {
    EPOCH = 0,
    DURATION = 1,
}
