import { Web3Error } from "web3";
import {
  ContractJsonDefinition,
  ContractKeychainDefinition,
  DeployedContractJsonDefinition,
  GasTransactionConfig,
  GasTransactionConfigEIP1559,
  GasTransactionConfigLegacy,
  Web3SigningCredentialCactiKeychainRef,
  Web3SigningCredentialGethKeychainPassword,
  Web3SigningCredentialNone,
  Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "../generated/openapi/typescript-axios/api";

export function isWeb3SigningCredentialPrivateKeyHex(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialPrivateKeyHex {
  return x?.type === Web3SigningCredentialType.PrivateKeyHex;
}

export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}

export function isWeb3SigningCredentialGethKeychainPassword(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialGethKeychainPassword {
  return x?.type === Web3SigningCredentialType.GethKeychainPassword;
}

export function isWeb3SigningCredentialCactiKeychainRef(x?: {
  type?: Web3SigningCredentialType;
  keychainEntryKey?: string | unknown;
  keychainId?: string | unknown;
}): x is Web3SigningCredentialCactiKeychainRef {
  return (
    !!x?.type &&
    x?.type === Web3SigningCredentialType.CactiKeychainRef &&
    !!x?.keychainEntryKey &&
    typeof x?.keychainEntryKey === "string" &&
    x?.keychainEntryKey.trim().length > 0 &&
    !!x?.keychainId &&
    typeof x?.keychainId === "string" &&
    x?.keychainId.trim().length > 0
  );
}

export function isGasTransactionConfigLegacy(
  gasConfig: GasTransactionConfig,
): gasConfig is GasTransactionConfigLegacy {
  const typedGasConfig = gasConfig as GasTransactionConfigLegacy;
  return (
    typeof typedGasConfig.gas !== "undefined" ||
    typeof typedGasConfig.gasPrice !== "undefined"
  );
}

export function isGasTransactionConfigEIP1559(
  gasConfig: GasTransactionConfig,
): gasConfig is GasTransactionConfigEIP1559 {
  const typedGasConfig = gasConfig as GasTransactionConfigEIP1559;
  return (
    typeof typedGasConfig.gasLimit !== "undefined" ||
    typeof typedGasConfig.maxFeePerGas !== "undefined" ||
    typeof typedGasConfig.maxPriorityFeePerGas !== "undefined"
  );
}

export function isContractJsonDefinition(
  contract: unknown,
): contract is ContractJsonDefinition {
  const typedContract = contract as ContractJsonDefinition;
  return typeof typedContract.contractJSON !== "undefined";
}

export function isDeployedContractJsonDefinition(
  contract: unknown,
): contract is DeployedContractJsonDefinition {
  const typedContract = contract as DeployedContractJsonDefinition;
  return (
    typeof typedContract.contractJSON !== "undefined" &&
    typeof typedContract.contractAddress !== "undefined"
  );
}

export function isContractKeychainDefinition(
  contract: unknown,
): contract is ContractKeychainDefinition {
  const typedContract = contract as ContractKeychainDefinition;
  return (
    typeof typedContract.contractName !== "undefined" &&
    typeof typedContract.keychainId !== "undefined"
  );
}

export function isWeb3Error(error: unknown): error is Web3Error {
  return (
    (error as Web3Error).name !== undefined &&
    (error as Web3Error).code !== undefined
  );
}
