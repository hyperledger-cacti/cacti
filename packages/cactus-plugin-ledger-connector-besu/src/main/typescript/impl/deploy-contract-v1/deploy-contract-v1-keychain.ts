import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  DeployContractSolidityBytecodeV1Request,
  DeployContractSolidityBytecodeV1Response,
  ReceiptType,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
} from "../../generated/openapi/typescript-axios";
import { isWeb3SigningCredentialNone } from "../../model-type-guards";
import createHttpError from "http-errors";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";
import Web3 from "web3";
import { transactV1Impl } from "../transact-v1/transact-v1-impl";
import Contract from "web3-eth-contract";

export interface IDeployContractV1KeychainResponse {
  status: boolean;
  contractAddress: string;
  contractName: string;
  contract?: Contract.Contract;
  deployResponse: DeployContractSolidityBytecodeV1Response;
}

export async function deployContractV1Keychain(
  ctx: {
    readonly pluginRegistry: PluginRegistry;
    readonly prometheusExporter: PrometheusExporter;
    readonly web3: Web3;
    readonly logLevel: LogLevelDesc;
  },
  req: DeployContractSolidityBytecodeV1Request,
): Promise<IDeployContractV1KeychainResponse> {
  const fnTag = `deployContractV1Keychain()`;
  Checks.truthy(req, `${fnTag} req`);

  const log = LoggerProvider.getOrCreate({
    label: fnTag,
    level: ctx.logLevel,
  });

  if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
    throw createHttpError[400](
      `${fnTag} Cannot deploy contract with pre-signed TX`,
    );
  }
  const { keychainId, contractName } = req;
  if (!keychainId || !req.contractName) {
    const errorMessage = `${fnTag} Cannot deploy contract without keychainId and the contractName.`;
    throw createHttpError[400](errorMessage);
  }

  const keychainPlugin = ctx.pluginRegistry.findOneByKeychainId(keychainId);

  if (!keychainPlugin) {
    const errorMessage =
      `${fnTag} The plugin registry does not contain` +
      ` a keychain plugin for ID:"${req.keychainId}"`;
    throw createHttpError[400](errorMessage);
  }

  if (!keychainPlugin.has(contractName)) {
    const errorMessage =
      `${fnTag} Cannot create an instance of the contract instance because` +
      `the contractName in the request does not exist on the keychain`;
    throw new createHttpError[400](errorMessage);
  }

  const networkId = await ctx.web3.eth.net.getId();

  const tmpContract = new ctx.web3.eth.Contract(req.contractAbi);
  const deployment = tmpContract.deploy({
    data: req.bytecode,
    arguments: req.constructorArgs,
  });

  const abi = deployment.encodeABI();
  const data = abi.startsWith("0x") ? abi : `0x${abi}`;
  log.debug(`Deploying "${req.contractName}" with data %o`, data);

  const web3SigningCredential = req.web3SigningCredential as
    | Web3SigningCredentialPrivateKeyHex
    | Web3SigningCredentialCactusKeychainRef;

  const transactV1ImplCtx = {
    prometheusExporter: ctx.prometheusExporter,
    pluginRegistry: ctx.pluginRegistry,
    logLevel: ctx.logLevel,
    web3: ctx.web3,
  };
  const transactV1ImplReq = {
    transactionConfig: {
      data,
      from: web3SigningCredential.ethAccount,
      gas: req.gas,
      gasPrice: req.gasPrice,
    },
    consistencyStrategy: {
      blockConfirmations: 0,
      receiptType: ReceiptType.NodeTxPoolAck,
      timeoutMs: req.timeoutMs || 60000,
    },
    web3SigningCredential,
    privateTransactionConfig: req.privateTransactionConfig,
  };
  const runTransactionResponse = await transactV1Impl(
    transactV1ImplCtx,
    transactV1ImplReq,
  );

  const keychainHasContract = await keychainPlugin.has(contractName);

  if (!keychainHasContract) {
    const errorMessage =
      `${fnTag} Cannot create an instance of the contract instance because` +
      `the contractName in the request does not exist on the keychain`;
    throw new createHttpError[400](errorMessage);
  }

  log.debug(`Keychain has the contract, updating networks...`);

  const { transactionReceipt: receipt } = runTransactionResponse;
  const { status, contractAddress } = receipt;

  if (status && contractAddress) {
    const networkInfo = { address: contractAddress };
    const contractStr = await keychainPlugin.get(contractName);
    const contractJSON = JSON.parse(contractStr);
    log.debug("Contract JSON: \n%o", JSON.stringify(contractJSON));
    const contract = new ctx.web3.eth.Contract(
      contractJSON.abi,
      contractAddress,
    );

    const network = { [networkId]: networkInfo };
    contractJSON.networks = network;

    await keychainPlugin.set(contractName, JSON.stringify(contractJSON));
    const deployResponse: DeployContractSolidityBytecodeV1Response = {
      transactionReceipt: runTransactionResponse.transactionReceipt,
    };
    const deployContractV1KeychainResponse: IDeployContractV1KeychainResponse =
      {
        status: status,
        contractAddress: contractAddress,
        contractName: contractName,
        contract: contract,
        deployResponse: deployResponse,
      };
    return deployContractV1KeychainResponse;
  } else {
    const deployResponse: DeployContractSolidityBytecodeV1Response = {
      transactionReceipt: runTransactionResponse.transactionReceipt,
    };
    const deployContractV1KeychainResponse: IDeployContractV1KeychainResponse =
      {
        status: status,
        contractAddress: "",
        contractName: contractName,
        deployResponse: deployResponse,
      };
    return deployContractV1KeychainResponse;
  }
}
