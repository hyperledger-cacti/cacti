// package: org.hyperledger.cacti.plugin.ledger.connector.besu
// file: models/deploy_contract_solidity_bytecode_no_keychain_v1_request_pb.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";
import * as google_protobuf_any_pb from "google-protobuf/google/protobuf/any_pb";
import * as models_besu_private_transaction_config_pb_pb from "../models/besu_private_transaction_config_pb_pb";
import * as models_web3_signing_credential_pb_pb from "../models/web3_signing_credential_pb_pb";

export class DeployContractSolidityBytecodeNoKeychainV1RequestPB extends jspb.Message { 
    getContractname(): string;
    setContractname(value: string): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    clearContractabiList(): void;
    getContractabiList(): Array<google_protobuf_any_pb.Any>;
    setContractabiList(value: Array<google_protobuf_any_pb.Any>): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    addContractabi(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;
    clearConstructorargsList(): void;
    getConstructorargsList(): Array<google_protobuf_any_pb.Any>;
    setConstructorargsList(value: Array<google_protobuf_any_pb.Any>): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    addConstructorargs(value?: google_protobuf_any_pb.Any, index?: number): google_protobuf_any_pb.Any;

    hasWeb3signingcredential(): boolean;
    clearWeb3signingcredential(): void;
    getWeb3signingcredential(): models_web3_signing_credential_pb_pb.Web3SigningCredentialPB | undefined;
    setWeb3signingcredential(value?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    getBytecode(): string;
    setBytecode(value: string): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    getGas(): number;
    setGas(value: number): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    getGasprice(): string;
    setGasprice(value: string): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    getTimeoutms(): number;
    setTimeoutms(value: number): DeployContractSolidityBytecodeNoKeychainV1RequestPB;

    hasPrivatetransactionconfig(): boolean;
    clearPrivatetransactionconfig(): void;
    getPrivatetransactionconfig(): models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB | undefined;
    setPrivatetransactionconfig(value?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB): DeployContractSolidityBytecodeNoKeychainV1RequestPB;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): DeployContractSolidityBytecodeNoKeychainV1RequestPB.AsObject;
    static toObject(includeInstance: boolean, msg: DeployContractSolidityBytecodeNoKeychainV1RequestPB): DeployContractSolidityBytecodeNoKeychainV1RequestPB.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: DeployContractSolidityBytecodeNoKeychainV1RequestPB, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
    static deserializeBinaryFromReader(message: DeployContractSolidityBytecodeNoKeychainV1RequestPB, reader: jspb.BinaryReader): DeployContractSolidityBytecodeNoKeychainV1RequestPB;
}

export namespace DeployContractSolidityBytecodeNoKeychainV1RequestPB {
    export type AsObject = {
        contractname: string,
        contractabiList: Array<google_protobuf_any_pb.Any.AsObject>,
        constructorargsList: Array<google_protobuf_any_pb.Any.AsObject>,
        web3signingcredential?: models_web3_signing_credential_pb_pb.Web3SigningCredentialPB.AsObject,
        bytecode: string,
        gas: number,
        gasprice: string,
        timeoutms: number,
        privatetransactionconfig?: models_besu_private_transaction_config_pb_pb.BesuPrivateTransactionConfigPB.AsObject,
    }
}
