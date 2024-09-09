// package: protos
// file: peer/chaincode.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as common_policies_pb from "../common/policies_pb";

export class ChaincodeID extends jspb.Message { 
    getPath(): string;
    setPath(value: string): ChaincodeID;
    getName(): string;
    setName(value: string): ChaincodeID;
    getVersion(): string;
    setVersion(value: string): ChaincodeID;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeID.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeID): ChaincodeID.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeID, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeID;
    static deserializeBinaryFromReader(message: ChaincodeID, reader: jspb.BinaryReader): ChaincodeID;
}

export namespace ChaincodeID {
    export type AsObject = {
        path: string,
        name: string,
        version: string,
    }
}

export class ChaincodeInput extends jspb.Message { 
    clearArgsList(): void;
    getArgsList(): Array<Uint8Array | string>;
    getArgsList_asU8(): Array<Uint8Array>;
    getArgsList_asB64(): Array<string>;
    setArgsList(value: Array<Uint8Array | string>): ChaincodeInput;
    addArgs(value: Uint8Array | string, index?: number): Uint8Array | string;

    getDecorationsMap(): jspb.Map<string, Uint8Array | string>;
    clearDecorationsMap(): void;
    getIsInit(): boolean;
    setIsInit(value: boolean): ChaincodeInput;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeInput.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeInput): ChaincodeInput.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeInput, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeInput;
    static deserializeBinaryFromReader(message: ChaincodeInput, reader: jspb.BinaryReader): ChaincodeInput;
}

export namespace ChaincodeInput {
    export type AsObject = {
        argsList: Array<Uint8Array | string>,

        decorationsMap: Array<[string, Uint8Array | string]>,
        isInit: boolean,
    }
}

export class ChaincodeSpec extends jspb.Message { 
    getType(): ChaincodeSpec.Type;
    setType(value: ChaincodeSpec.Type): ChaincodeSpec;

    hasChaincodeId(): boolean;
    clearChaincodeId(): void;
    getChaincodeId(): ChaincodeID | undefined;
    setChaincodeId(value?: ChaincodeID): ChaincodeSpec;

    hasInput(): boolean;
    clearInput(): void;
    getInput(): ChaincodeInput | undefined;
    setInput(value?: ChaincodeInput): ChaincodeSpec;
    getTimeout(): number;
    setTimeout(value: number): ChaincodeSpec;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeSpec.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeSpec): ChaincodeSpec.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeSpec, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeSpec;
    static deserializeBinaryFromReader(message: ChaincodeSpec, reader: jspb.BinaryReader): ChaincodeSpec;
}

export namespace ChaincodeSpec {
    export type AsObject = {
        type: ChaincodeSpec.Type,
        chaincodeId?: ChaincodeID.AsObject,
        input?: ChaincodeInput.AsObject,
        timeout: number,
    }

    export enum Type {
    UNDEFINED = 0,
    GOLANG = 1,
    NODE = 2,
    CAR = 3,
    JAVA = 4,
    }

}

export class ChaincodeDeploymentSpec extends jspb.Message { 

    hasChaincodeSpec(): boolean;
    clearChaincodeSpec(): void;
    getChaincodeSpec(): ChaincodeSpec | undefined;
    setChaincodeSpec(value?: ChaincodeSpec): ChaincodeDeploymentSpec;
    getCodePackage(): Uint8Array | string;
    getCodePackage_asU8(): Uint8Array;
    getCodePackage_asB64(): string;
    setCodePackage(value: Uint8Array | string): ChaincodeDeploymentSpec;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeDeploymentSpec.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeDeploymentSpec): ChaincodeDeploymentSpec.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeDeploymentSpec, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeDeploymentSpec;
    static deserializeBinaryFromReader(message: ChaincodeDeploymentSpec, reader: jspb.BinaryReader): ChaincodeDeploymentSpec;
}

export namespace ChaincodeDeploymentSpec {
    export type AsObject = {
        chaincodeSpec?: ChaincodeSpec.AsObject,
        codePackage: Uint8Array | string,
    }
}

export class ChaincodeInvocationSpec extends jspb.Message { 

    hasChaincodeSpec(): boolean;
    clearChaincodeSpec(): void;
    getChaincodeSpec(): ChaincodeSpec | undefined;
    setChaincodeSpec(value?: ChaincodeSpec): ChaincodeInvocationSpec;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeInvocationSpec.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeInvocationSpec): ChaincodeInvocationSpec.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeInvocationSpec, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeInvocationSpec;
    static deserializeBinaryFromReader(message: ChaincodeInvocationSpec, reader: jspb.BinaryReader): ChaincodeInvocationSpec;
}

export namespace ChaincodeInvocationSpec {
    export type AsObject = {
        chaincodeSpec?: ChaincodeSpec.AsObject,
    }
}

export class LifecycleEvent extends jspb.Message { 
    getChaincodeName(): string;
    setChaincodeName(value: string): LifecycleEvent;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): LifecycleEvent.AsObject;
    static toObject(includeInstance: boolean, msg: LifecycleEvent): LifecycleEvent.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: LifecycleEvent, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): LifecycleEvent;
    static deserializeBinaryFromReader(message: LifecycleEvent, reader: jspb.BinaryReader): LifecycleEvent;
}

export namespace LifecycleEvent {
    export type AsObject = {
        chaincodeName: string,
    }
}

export class CDSData extends jspb.Message { 
    getHash(): Uint8Array | string;
    getHash_asU8(): Uint8Array;
    getHash_asB64(): string;
    setHash(value: Uint8Array | string): CDSData;
    getMetadatahash(): Uint8Array | string;
    getMetadatahash_asU8(): Uint8Array;
    getMetadatahash_asB64(): string;
    setMetadatahash(value: Uint8Array | string): CDSData;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): CDSData.AsObject;
    static toObject(includeInstance: boolean, msg: CDSData): CDSData.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: CDSData, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): CDSData;
    static deserializeBinaryFromReader(message: CDSData, reader: jspb.BinaryReader): CDSData;
}

export namespace CDSData {
    export type AsObject = {
        hash: Uint8Array | string,
        metadatahash: Uint8Array | string,
    }
}

export class ChaincodeData extends jspb.Message { 
    getName(): string;
    setName(value: string): ChaincodeData;
    getVersion(): string;
    setVersion(value: string): ChaincodeData;
    getEscc(): string;
    setEscc(value: string): ChaincodeData;
    getVscc(): string;
    setVscc(value: string): ChaincodeData;

    hasPolicy(): boolean;
    clearPolicy(): void;
    getPolicy(): common_policies_pb.SignaturePolicyEnvelope | undefined;
    setPolicy(value?: common_policies_pb.SignaturePolicyEnvelope): ChaincodeData;
    getData(): Uint8Array | string;
    getData_asU8(): Uint8Array;
    getData_asB64(): string;
    setData(value: Uint8Array | string): ChaincodeData;
    getId(): Uint8Array | string;
    getId_asU8(): Uint8Array;
    getId_asB64(): string;
    setId(value: Uint8Array | string): ChaincodeData;

    hasInstantiationPolicy(): boolean;
    clearInstantiationPolicy(): void;
    getInstantiationPolicy(): common_policies_pb.SignaturePolicyEnvelope | undefined;
    setInstantiationPolicy(value?: common_policies_pb.SignaturePolicyEnvelope): ChaincodeData;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): ChaincodeData.AsObject;
    static toObject(includeInstance: boolean, msg: ChaincodeData): ChaincodeData.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: ChaincodeData, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): ChaincodeData;
    static deserializeBinaryFromReader(message: ChaincodeData, reader: jspb.BinaryReader): ChaincodeData;
}

export namespace ChaincodeData {
    export type AsObject = {
        name: string,
        version: string,
        escc: string,
        vscc: string,
        policy?: common_policies_pb.SignaturePolicyEnvelope.AsObject,
        data: Uint8Array | string,
        id: Uint8Array | string,
        instantiationPolicy?: common_policies_pb.SignaturePolicyEnvelope.AsObject,
    }
}
