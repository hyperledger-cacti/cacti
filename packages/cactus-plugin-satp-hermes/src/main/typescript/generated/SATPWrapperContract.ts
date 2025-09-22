import BN from 'bn.js';
import BigNumber from 'bignumber.js';
import {
  PromiEvent,
  TransactionReceipt,
  EventResponse,
  EventData,
  Web3ContractContext,
} from 'ethereum-abi-types-generator';

export interface CallOptions {
  from?: string;
  gasPrice?: string;
  gas?: number;
}

export interface SendOptions {
  from: string;
  value?: number | string | BN | BigNumber;
  gasPrice?: string;
  gas?: number;
}

export interface EstimateGasOptions {
  from?: string;
  value?: number | string | BN | BigNumber;
  gas?: number;
}

export interface MethodPayableReturnContext {
  send(options: SendOptions): PromiEvent<TransactionReceipt>;
  send(
    options: SendOptions,
    callback: (error: Error, result: any) => void
  ): PromiEvent<TransactionReceipt>;
  estimateGas(options: EstimateGasOptions): Promise<number>;
  estimateGas(
    options: EstimateGasOptions,
    callback: (error: Error, result: any) => void
  ): Promise<number>;
  encodeABI(): string;
}

export interface MethodConstantReturnContext<TCallReturn> {
  call(): Promise<TCallReturn>;
  call(options: CallOptions): Promise<TCallReturn>;
  call(
    options: CallOptions,
    callback: (error: Error, result: TCallReturn) => void
  ): Promise<TCallReturn>;
  encodeABI(): string;
}

export interface MethodReturnContext extends MethodPayableReturnContext {}

export type ContractContext = Web3ContractContext<
  SATPWrapperContract,
  SATPWrapperContractMethodNames,
  SATPWrapperContractEventsContext,
  SATPWrapperContractEvents
>;
export type SATPWrapperContractEvents =
  | 'Assign'
  | 'Burn'
  | 'Changed'
  | 'Lock'
  | 'Mint'
  | 'OwnershipTransferred'
  | 'Unlock'
  | 'Unwrap'
  | 'Wrap';
export interface SATPWrapperContractEventsContext {
  Assign(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Burn(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Changed(
    parameters: {
      filter?: { id?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Lock(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Mint(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  OwnershipTransferred(
    parameters: {
      filter?: {
        previousOwner?: string | string[];
        newOwner?: string | string[];
      };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Unlock(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Unwrap(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
  Wrap(
    parameters: {
      filter?: { tokenId?: string | string[] };
      fromBlock?: number;
      toBlock?: 'latest' | number;
      topics?: string[];
    },
    callback?: (error: Error, event: EventData) => void
  ): EventResponse;
}
export type SATPWrapperContractMethodNames =
  | 'new'
  | 'assign'
  | 'bridge_address'
  | 'burn'
  | 'getAllAssetsIDs'
  | 'getToken'
  | 'lock'
  | 'mint'
  | 'owner'
  | 'renounceOwnership'
  | 'tokens'
  | 'tokensInteractions'
  | 'transferOwnership'
  | 'unlock'
  | 'unwrap'
  | 'wrap'
  | 'wrap';
export interface TokenResponse {
  contractAddress: string;
  tokenType: string;
  tokenId: string;
  owner: string;
  amount: string;
}
export interface TokensResponse {
  contractAddress: string;
  tokenType: string;
  tokenId: string;
  owner: string;
  amount: string;
}
export interface TokensInteractionsResponse {
  interactionType: string;
  available: boolean;
}
export interface InteractionsRequest {
  interactionType: string | number;
  functionsSignature: string[];
  variables: string | number[][];
  available: boolean;
}
export interface AssignEventEmittedResponse {
  tokenId: string;
  receiver_account: string;
  amount: string;
}
export interface BurnEventEmittedResponse {
  tokenId: string;
  amount: string;
}
export interface ChangedEventEmittedResponse {
  id: string;
  value: string | number[][];
}
export interface LockEventEmittedResponse {
  tokenId: string;
  amount: string;
}
export interface MintEventEmittedResponse {
  tokenId: string;
  amount: string;
}
export interface OwnershipTransferredEventEmittedResponse {
  previousOwner: string;
  newOwner: string;
}
export interface UnlockEventEmittedResponse {
  tokenId: string;
  amount: string;
}
export interface UnwrapEventEmittedResponse {
  tokenId: string;
}
export interface WrapEventEmittedResponse {
  tokenId: string;
  contractAddress: string;
  tokenType: string | number;
  owner: string;
}
export interface SATPWrapperContract {
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: constructor
   * @param _bridge_address Type: address, Indexed: false
   */
  'new'(_bridge_address: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   * @param receiver_account Type: address, Indexed: false
   * @param amount Type: uint256, Indexed: false
   */
  assign(
    tokenId: string,
    receiver_account: string,
    amount: string
  ): MethodReturnContext;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  bridge_address(): MethodConstantReturnContext<string>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   * @param amount Type: uint256, Indexed: false
   */
  burn(tokenId: string, amount: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  getAllAssetsIDs(): MethodConstantReturnContext<string[]>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param tokenId Type: string, Indexed: false
   */
  getToken(tokenId: string): MethodConstantReturnContext<TokenResponse>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   * @param amount Type: uint256, Indexed: false
   */
  lock(tokenId: string, amount: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   * @param amount Type: uint256, Indexed: false
   */
  mint(tokenId: string, amount: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   */
  owner(): MethodConstantReturnContext<string>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   */
  renounceOwnership(): MethodReturnContext;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param parameter0 Type: string, Indexed: false
   */
  tokens(parameter0: string): MethodConstantReturnContext<TokensResponse>;
  /**
   * Payable: false
   * Constant: true
   * StateMutability: view
   * Type: function
   * @param parameter0 Type: string, Indexed: false
   * @param parameter1 Type: uint8, Indexed: false
   */
  tokensInteractions(
    parameter0: string,
    parameter1: string | number
  ): MethodConstantReturnContext<TokensInteractionsResponse>;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param newOwner Type: address, Indexed: false
   */
  transferOwnership(newOwner: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   * @param amount Type: uint256, Indexed: false
   */
  unlock(tokenId: string, amount: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param tokenId Type: string, Indexed: false
   */
  unwrap(tokenId: string): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param contractAddress Type: address, Indexed: false
   * @param tokenType Type: uint8, Indexed: false
   * @param tokenId Type: string, Indexed: false
   * @param owner Type: address, Indexed: false
   * @param interactions Type: tuple[], Indexed: false
   */
  wrap(
    contractAddress: string,
    tokenType: string | number,
    tokenId: string,
    owner: string,
    interactions: InteractionsRequest[]
  ): MethodReturnContext;
  /**
   * Payable: false
   * Constant: false
   * StateMutability: nonpayable
   * Type: function
   * @param contractAddress Type: address, Indexed: false
   * @param tokenType Type: uint8, Indexed: false
   * @param tokenId Type: string, Indexed: false
   * @param owner Type: address, Indexed: false
   */
  wrap(
    contractAddress: string,
    tokenType: string | number,
    tokenId: string,
    owner: string
  ): MethodReturnContext;
}
