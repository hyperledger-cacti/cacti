import {
  Checks,
  LogLevelDesc,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  DeployContractSolidityBytecodeNoKeychainV1Request,
  DeployContractSolidityBytecodeV1Response,
  ReceiptType,
  Web3SigningCredentialCactusKeychainRef,
  Web3SigningCredentialPrivateKeyHex,
} from "../../generated/openapi/typescript-axios";
import { isWeb3SigningCredentialNone } from "../../model-type-guards";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { PrometheusExporter } from "../../prometheus-exporter/prometheus-exporter";
import Web3 from "web3";
import { transactV1Impl } from "../transact-v1/transact-v1-impl";

export async function deployContractV1NoKeychain(
  ctx: {
    readonly pluginRegistry: PluginRegistry;
    readonly prometheusExporter: PrometheusExporter;
    readonly web3: Web3;
    readonly logLevel: LogLevelDesc;
  },
  req: DeployContractSolidityBytecodeNoKeychainV1Request,
): Promise<DeployContractSolidityBytecodeV1Response> {
  const fnTag = `deployContractNoKeychain()`;
  Checks.truthy(req, `${fnTag} req`);

  const log = LoggerProvider.getOrCreate({
    label: "deployContractV1NoKeychain()",
    level: ctx.logLevel,
  });

  if (isWeb3SigningCredentialNone(req.web3SigningCredential)) {
    throw new Error(`${fnTag} Cannot deploy contract with pre-signed TX`);
  }

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
  const runTxResponse = await transactV1Impl(
    transactV1ImplCtx,
    transactV1ImplReq,
  );

  const { transactionReceipt: receipt } = runTxResponse;
  const { status, contractAddress } = receipt;

  Checks.truthy(status, `deployContractNoKeychain():status`);

  Checks.truthy(contractAddress, `deployContractNoKeychain():contractAddress`);

  const res: DeployContractSolidityBytecodeV1Response = {
    transactionReceipt: runTxResponse.transactionReceipt,
  };
  return res;
}
