import { Gateway } from "fabric-network";
// BlockDecoder is not exported in ts definition so we need to use legacy import.
const { BlockDecoder } = require("fabric-common");

const QSCC_ContractName = "qscc";

/**
 * Configuration parameter type for `querySystemChainCode` function.
 */
export interface QuerySystemChainCodeConfig {
  gateway: Gateway;
  connectionChannelName: string; // used to connect to the network
  skipDecode?: boolean;
}

/**
 * Call method on fabric system contract `qscc` and return decoded or encoded response.
 *
 * @param config Configuration of `querySystemChainCode` method itself.
 * @param functionName Method on `qscc` to call.
 * @param args Args to method from `functionName`
 * @returns Encoded `Buffer` or decoded `JSON string` response from the ledger.
 */
export async function querySystemChainCode(
  config: QuerySystemChainCodeConfig,
  functionName: string,
  ...args: (string | Buffer)[]
): Promise<Buffer | any> {
  const { gateway, connectionChannelName, skipDecode } = config;
  const network = await gateway.getNetwork(connectionChannelName);
  const contract = network.getContract(QSCC_ContractName);

  const resultBuffer = await contract.evaluateTransaction(
    functionName,
    ...(args as string[]), // contract expects byte[], node Buffer fits well here as well
  );
  if (!resultBuffer) {
    throw new Error(`Received empty response from qscc call ${functionName}`);
  }

  if (skipDecode) {
    return resultBuffer;
  }

  return BlockDecoder.decode(resultBuffer);
}
