import { Gateway } from "fabric-network";

const QSCC_ContractName = "qscc";

/**
 * Configuration parameter type for `querySystemChainCode` function.
 */
export interface QuerySystemChainCodeConfig {
  gateway: Gateway;
  connectionChannelName: string; // used to connect to the network
}

/**
 * Call method on fabric system contract `qscc` and return decoded or encoded response.
 *
 * @param config Configuration of `querySystemChainCode` method itself.
 * @param functionName Method on `qscc` to call.
 * @param args Args to method from `functionName`
 *
 * @returns Encoded `Buffer` response from the ledger.
 */
export async function querySystemChainCode(
  config: QuerySystemChainCodeConfig,
  functionName: string,
  ...args: (string | Buffer)[]
): Promise<Buffer> {
  const { gateway, connectionChannelName } = config;
  const network = await gateway.getNetwork(connectionChannelName);
  const contract = network.getContract(QSCC_ContractName);

  const resultBuffer = await contract.evaluateTransaction(
    functionName,
    ...(args as string[]), // contract expects byte[], node Buffer fits well here as well
  );
  if (!resultBuffer) {
    throw new Error(`Received empty response from qscc call ${functionName}`);
  }

  return resultBuffer;
}
