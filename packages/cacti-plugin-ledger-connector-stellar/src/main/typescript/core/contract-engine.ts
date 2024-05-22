import { ContractEngine } from "stellar-plus/lib/stellar-plus/core/contract-engine";
import { SorobanTransactionPipelineOptions } from "stellar-plus/lib/stellar-plus/core/pipelines/soroban-transaction/types";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { TransactionInvocation } from "stellar-plus/lib/stellar-plus/types";

export interface DeployContractWithWasmOptions
  extends BaseContractEngineInvocation {
  wasmBuffer: Buffer;
}

export interface DeployContractWithWasmHashOptions
  extends BaseContractEngineInvocation {
  wasmHash: string;
}

export interface DeployContractOutput {
  contractId: string;
  wasmHash: string;
}

interface BaseContractEngineInvocation {
  txInvocation: TransactionInvocation;
  pipelineOptions?: SorobanTransactionPipelineOptions;
  fnLogPrefix: string;
  networkConfig: NetworkConfig;
}

/**
 * Deploys a contract to the Stellar network. Accepts either a WebAssembly binary buffer or a hash of the WebAssembly binary code in the ledger.
 *
 * @param {DeployContractWithWasmOptions | DeployContractWithWasmHashOptions} options - Options for deploying a contract.
 * @param {TransactionInvocation} options.txInvocation - Transaction invocation object containing the parameters to configure the transaction envelope.
 * @param {SorobanTransactionPipelineOptions} [options.pipelineOptions] - Options for the Soroban transaction pipeline.
 * @param {string} options.fnLogPrefix - Prefix for log messages.
 * @param {NetworkConfig} options.networkConfig - Network configuration object. Contains the details of the services available to interact with the Stellar network.
 * @param {Buffer} [options.wasmBuffer] - Buffer containing the WebAssembly binary code of the contract.
 * @param {string} [options.wasmHash] - Hash of the WebAssembly binary code of the contract from the ledger.
 *
 * @returns {Promise<DeployContractOutput>} - Returns the contract ID and the hash of the WebAssembly binary code of the contract.
 *
 * @throws {Error} - Throws an error if the contract deployment fails.
 *
 */
export const deployContract = async (
  options: DeployContractWithWasmOptions | DeployContractWithWasmHashOptions,
): Promise<DeployContractOutput> => {
  const { networkConfig, txInvocation, fnLogPrefix, pipelineOptions } = options;

  const fnTag = `${fnLogPrefix}#deployContract()`;

  const contractEngine = new ContractEngine({
    networkConfig,
    contractParameters: {
      wasm: (options as DeployContractWithWasmOptions).wasmBuffer,
      wasmHash: (options as DeployContractWithWasmHashOptions).wasmHash,
    },
    options: {
      sorobanTransactionPipeline: pipelineOptions,
    },
  });

  if ((options as DeployContractWithWasmOptions).wasmBuffer) {
    await contractEngine.uploadWasm(txInvocation).catch((error) => {
      throw new Error(`${fnTag} Failed to upload wasm. ` + error);
    });
  }

  await contractEngine.deploy(txInvocation).catch((error) => {
    throw new Error(`${fnTag} Failed to deploy contract. ` + error);
  });

  const output: DeployContractOutput = {
    contractId: contractEngine.getContractId(),
    wasmHash: contractEngine.getWasmHash(),
  };

  return output;
};
