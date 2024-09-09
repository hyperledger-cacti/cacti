// package: common.access_control
// file: common/access_control.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class AccessControlPolicy extends jspb.Message { 
    getSecuritydomain(): string;
    setSecuritydomain(value: string): AccessControlPolicy;
    clearRulesList(): void;
    getRulesList(): Array<Rule>;
    setRulesList(value: Array<Rule>): AccessControlPolicy;
    addRules(value?: Rule, index?: number): Rule;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): AccessControlPolicy.AsObject;
    static toObject(includeInstance: boolean, msg: AccessControlPolicy): AccessControlPolicy.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: AccessControlPolicy, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): AccessControlPolicy;
    static deserializeBinaryFromReader(message: AccessControlPolicy, reader: jspb.BinaryReader): AccessControlPolicy;
}

export namespace AccessControlPolicy {
    export type AsObject = {
        securitydomain: string,
        rulesList: Array<Rule.AsObject>,
    }
}

export class Rule extends jspb.Message { 
    getPrincipal(): string;
    setPrincipal(value: string): Rule;
    getPrincipaltype(): string;
    setPrincipaltype(value: string): Rule;
    getResource(): string;
    setResource(value: string): Rule;
    getRead(): boolean;
    setRead(value: boolean): Rule;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Rule.AsObject;
    static toObject(includeInstance: boolean, msg: Rule): Rule.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Rule, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Rule;
    static deserializeBinaryFromReader(message: Rule, reader: jspb.BinaryReader): Rule;
}

export namespace Rule {
    export type AsObject = {
        principal: string,
        principaltype: string,
        resource: string,
        read: boolean,
    }
}
