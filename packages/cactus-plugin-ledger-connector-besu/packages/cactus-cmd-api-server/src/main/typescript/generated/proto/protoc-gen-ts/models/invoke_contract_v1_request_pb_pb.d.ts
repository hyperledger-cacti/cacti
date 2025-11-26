// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/invoke_contract_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_besu_private_transaction_config_pb_pb from "../models/besu_private_transaction_config_pb_pb";
import * as models_eth_contract_invocation_type_pb_pb from "../models/eth_contract_invocation_type_pb_pb";
import * as models_web3_block_header_timestamp_pb_pb from "../models/web3_block_header_timestamp_pb_pb";
import * as models_web3_signing_credential_pb_pb from "../models/web3_signing_credential_pb_pb";

export class InvokeContractV1RequestPB extends jspb.Message { 
    getContractname(): string;
    setContractname(value: string): InvokeContractV1RequestPB;

    hasSigningcredential(): boolean;
    clearSigningcredential(): void;
    getSigningcredential(): models_web3_signing_credential_pb_pb.Web3SigningCredentialPB | undefined;
    setSigningcredential(value?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB): InvokeContractV1RequestPB;
    getInvocationtype(): models_eth_contract_invocation_type_pb_pb.EthContractInvocationTypePB;
    setInvocationtype(value: models_eth_contract_invocation_type_pb_pb.EthContractInvocationTypePB): InvokeContractV1RequestPB;
    getMethodname(): string;
    setMethodname(value: string): InvokeContractV1RequestPB;
    clearParamsList(): void;
    getParamsList(): Array<google_protobuf_any_pb.Any>;
    setParamsList(value: Array<google_protobuf_any_pb.Any>): InvokeContractV1RequestPB;
    addParams(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;
    clearContractabiList(): void;
    getContractabiList(): Array<google_protobuf_any_pb.Any>;
    setContractabiList(value: Array<google_protobuf_any_pb.Any>): InvokeContractV1RequestPB;
    addContractabi(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;
    getContractaddress(): string;
    setContractaddress(value: string): InvokeContractV1RequestPB;

    hasValue(): boolean;
    clearValue(): void;
    getValue(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setValue(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): InvokeContractV1RequestPB;

    hasGas(): boolean;
    clearGas(): void;
    getGas(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setGas(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): InvokeContractV1RequestPB;

    hasGasprice(): boolean;
    clearGasprice(): void;
    getGasprice(): models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB | undefined;
    setGasprice(value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB): InvokeContractV1RequestPB;
    getNonce(): number;
    setNonce(value: number): InvokeContractV1RequestPB;
    getTimeoutms(): number;
    setTimeoutms(value: number): InvokeContractV1RequestPB;
    getKeychainid(): string;
    setKeychainid(value: string): InvokeContractV1RequestPB;

    hasPrivatetransactionconfig(): boolean;
    clearPrivatetransactionconfig(): void;
    getPrivatetransactionconfig(): models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB | undefined;
    setPrivatetransactionconfig(value?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB): InvokeContractV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): InvokeContractV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: InvokeContractV1RequestPB): InvokeContractV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: InvokeContractV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): InvokeContractV1RequestPB;
    static deserializeBinaryFromReader(message: InvokeContractV1RequestPB, reader: jspb.BinaryReader): InvokeContractV1RequestPB;
}

export namespace InvokeContractV1RequestPB {
    export type AsObject = {
        contractname: string,
        signingcredential?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB.AsObject,
        invocationtype: models_eth_contract_invocation_type_pb_pb.EthContractInvocationTypePB,
        methodname: string,
        paramsList: Array<google_protobuf_any_pb.Any.AsObject>,
        contractabiList: Array<google_protobuf_any_pb.Any.AsObject>,
        contractaddress: string,
        value?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        gas?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        gasprice?: models_web3_block_header_timestamp_pb_pb.Web3BlockHeaderTimestampPB.AsObject,
        nonce: number,
        timeoutms: number,
        keychainid: string,
        privatetransactionconfig?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB.AsObject,
    }
}
