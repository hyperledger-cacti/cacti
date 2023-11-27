// package: common.query
// file: common/query.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Query extends jspb.Message { 
    clearPolicyList(): void;
    getPolicyList(): Array<string>;
    setPolicyList(value: Array<string>): Query;
    addPolicy(value: string, index?: number): string;
    getAddress(): string;
    setAddress(value: string): Query;
    getRequestingRelay(): string;
    setRequestingRelay(value: string): Query;
    getRequestingNetwork(): string;
    setRequestingNetwork(value: string): Query;
    getCertificate(): string;
    setCertificate(value: string): Query;
    getRequestorSignature(): string;
    setRequestorSignature(value: string): Query;
    getNonce(): string;
    setNonce(value: string): Query;
    getRequestId(): string;
    setRequestId(value: string): Query;
    getRequestingOrg(): string;
    setRequestingOrg(value: string): Query;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Query.AsObject;
    static toObject(includeInstance: boolean, msg: Query): Query.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Query, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Query;
    static deserializeBinaryFromReader(message: Query, reader: jspb.BinaryReader): Query;
}

export namespace Query {
    export type AsObject = {
        policyList: Array<string>,
        address: string,
        requestingRelay: string,
        requestingNetwork: string,
        certificate: string,
        requestorSignature: string,
        nonce: string,
        requestId: string,
        requestingOrg: string,
    }
}
