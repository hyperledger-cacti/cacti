import { ContractEngine } from "stellar-plus/lib/stellar-plus/core/contract-engine";
import { SorobanTransactionPipelineOptions } from "stellar-plus/lib/stellar-plus/core/pipelines/soroban-transaction/types";
import { NetworkConfig } from "stellar-plus/lib/stellar-plus/network";
import { TransactionInvocation } from "stellar-plus/lib/stellar-plus/types";
import { Core as SPCore } from "stellar-plus/lib/stellar-plus/core/index";

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

export interface InvokeContractOptions<T> extends BaseInvokeContractOptions<T> {
  readOnly: false;
}
export interface ReadContractOptions<T> extends BaseInvokeContractOptions<T> {
  readOnly: true;
}

export interface BaseInvokeContractOptions<T>
  extends BaseContractEngineInvocation {
  contractId: string;
  method: string;
  methodArgs: T;
  specXdr: string[];
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

/**
 *
 * Invokes a contract on the Stellar network. Can perform a full contract invocation or a read-only contract invocation.
 * Read-only should be used when the contract does not modify the ledger state. In these cases, the contract invocation is not submitted to the network.
 * Only a simulation is performed to determine the result of the contract invocation, therefore no fees are incurred.
 *
 * @param {InvokeContractOptions<T> | ReadContractOptions<T>} options - Options for invoking a contract.
 * @param {TransactionInvocation} options.txInvocation - Transaction invocation object containing the parameters to configure the transaction envelope.
 * @param {SorobanTransactionPipelineOptions} [options.pipelineOptions] - Options for the Soroban transaction pipeline.
 * @param {string} options.fnLogPrefix - Prefix for log messages.
 * @param {NetworkConfig} options.networkConfig - Network configuration object. Contains the details of the services available to interact with the Stellar network.
 * @param {string} options.contractId - Contract ID of the contract to invoke.
 * @param {string} options.method - Method to invoke on the contract.
 * @param {T} options.methodArgs - Object containing the arguments to pass to the method.
 * @param {string[]} options.specXdr - Array of strings containing the XDR of the contract specification.
 * @param {boolean} options.readOnly - Flag to indicate if the contract invocation is read-only.
 *
 * @returns {Promise<unknown>} - Returns the result of the contract invocation.
 *
 * @throws {Error} - Throws an error if the contract invocation fails.
 * @throws {Error} - Throws an error if the contract read fails.
 *
 *
 * @returns
 */
export const invokeContract = async <T>(
  options: InvokeContractOptions<T> | ReadContractOptions<T>,
): Promise<unknown> => {
  const {
    networkConfig,
    txInvocation,
    fnLogPrefix,
    pipelineOptions,
    contractId,
    method,
    methodArgs,
    specXdr,
  } = options;

  const fnTag = `${fnLogPrefix}#invokeContract()`;

  const contractEngine = new ContractEngine({
    networkConfig,
    contractParameters: {
      contractId: contractId,
      spec: new SPCore.ContractSpec(specXdr),
    },
    options: {
      sorobanTransactionPipeline: pipelineOptions,
    },
  });

  if (options.readOnly) {
    return await contractEngine
      .readFromContract({
        method,
        methodArgs: methodArgs as object,
        ...txInvocation,
      })
      .catch((error) => {
        throw new Error(`${fnTag} Failed to read contract. ` + error);
      });
  }

  return await contractEngine
    .invokeContract({
      method,
      methodArgs: methodArgs as object,
      ...txInvocation,
    })
    .catch((error) => {
      throw new Error(`${fnTag} Failed to invoke contract. ` + error);
    });
};
