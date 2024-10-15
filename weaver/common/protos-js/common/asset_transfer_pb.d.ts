// package: common.asset_transfer
// file: common/asset_transfer.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AssetPledge extends jspb.Message { 
    getAssetdetails(): Uint8Array | string;
    getAssetdetails_asU8(): Uint8Array;
    getAssetdetails_asB64(): string;
    setAssetdetails(value: Uint8Array | string): AssetPledge;
    getLocalnetworkid(): string;
    setLocalnetworkid(value: string): AssetPledge;
    getRemotenetworkid(): string;
    setRemotenetworkid(value: string): AssetPledge;
    getRecipient(): string;
    setRecipient(value: string): AssetPledge;
    getExpirytimesecs(): number;
    setExpirytimesecs(value: number): AssetPledge;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetPledge.AsObject;
    static toObject(includeInstance: boolean, msg: AssetPledge): AssetPledge.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetPledge, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetPledge;
    static deserializeBinaryFromReader(message: AssetPledge, reader: jspb.BinaryReader): AssetPledge;
}

export namespace AssetPledge {
    export type AsObject = {
        assetdetails: Uint8Array | string,
        localnetworkid: string,
        remotenetworkid: string,
        recipient: string,
        expirytimesecs: number,
    }
}

export class AssetClaimStatus extends jspb.Message { 
    getAssetdetails(): Uint8Array | string;
    getAssetdetails_asU8(): Uint8Array;
    getAssetdetails_asB64(): string;
    setAssetdetails(value: Uint8Array | string): AssetClaimStatus;
    getLocalnetworkid(): string;
    setLocalnetworkid(value: string): AssetClaimStatus;
    getRemotenetworkid(): string;
    setRemotenetworkid(value: string): AssetClaimStatus;
    getRecipient(): string;
    setRecipient(value: string): AssetClaimStatus;
    getClaimstatus(): boolean;
    setClaimstatus(value: boolean): AssetClaimStatus;
    getExpirytimesecs(): number;
    setExpirytimesecs(value: number): AssetClaimStatus;
    getExpirationstatus(): boolean;
    setExpirationstatus(value: boolean): AssetClaimStatus;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AssetClaimStatus.AsObject;
    static toObject(includeInstance: boolean, msg: AssetClaimStatus): AssetClaimStatus.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AssetClaimStatus, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AssetClaimStatus;
    static deserializeBinaryFromReader(message: AssetClaimStatus, reader: jspb.BinaryReader): AssetClaimStatus;
}

export namespace AssetClaimStatus {
    export type AsObject = {
        assetdetails: Uint8Array | string,
        localnetworkid: string,
        remotenetworkid: string,
        recipient: string,
        claimstatus: boolean,
        expirytimesecs: number,
        expirationstatus: boolean,
    }
}
