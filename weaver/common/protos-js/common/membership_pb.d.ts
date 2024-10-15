// package: common.membership
// file: common/membership.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Membership extends jspb.Message { 
    getSecuritydomain(): string;
    setSecuritydomain(value: string): Membership;

    getMembersMap(): jspb.Map<string, Member>;
    clearMembersMap(): void;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Membership.AsObject;
    static toObject(includeInstance: boolean, msg: Membership): Membership.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Membership, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Membership;
    static deserializeBinaryFromReader(message: Membership, reader: jspb.BinaryReader): Membership;
}

export namespace Membership {
    export type AsObject = {
        securitydomain: string,

        membersMap: Array<[string, Member.AsObject]>,
    }
}

export class Member extends jspb.Message { 
    getValue(): string;
    setValue(value: string): Member;
    getType(): string;
    setType(value: string): Member;
    clearChainList(): void;
    getChainList(): Array<string>;
    setChainList(value: Array<string>): Member;
    addChain(value: string, index?: number): string;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Member.AsObject;
    static toObject(includeInstance: boolean, msg: Member): Member.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Member, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Member;
    static deserializeBinaryFromReader(message: Member, reader: jspb.BinaryReader): Member;
}

export namespace Member {
    export type AsObject = {
        value: string,
        type: string,
        chainList: Array<string>,
    }
}
