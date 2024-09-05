import { Logger } from "@hyperledger/cactus-common";

import { FabricSigningCredential } from "../../../main/typescript/generated/openapi/typescript-axios/api";
import { FabricContractInvocationType } from "../../../main/typescript/generated/openapi/typescript-axios/api";
import { GatewayOptions } from "../../../main/typescript/generated/openapi/typescript-axios/api";
import { DefaultApi as FabricApi } from "../../../main/typescript/generated/openapi/typescript-axios/api";

/**
 * Create new asset on the ledger to trigger new transaction creation.
 *
 * @param assetName unique asset name to create
 * @returns committed transaction id.
 */
export async function sendTransactionOnFabric(opts: {
  readonly gatewayOptions: GatewayOptions;
  readonly log: Logger;
  readonly apiClient: FabricApi;
  readonly assetName: string;
  readonly ledgerChannelName: string;
  readonly ledgerContractName: string;
}) {
  const fn = "sendTransactionOnFabric()";

  if (!opts) {
    throw new TypeError(`${fn} arg opts cannot be falsy.`);
  }
  const { log, apiClient, gatewayOptions, assetName } = opts;
  const { ledgerContractName, ledgerChannelName } = opts;

  if (!opts.gatewayOptions) {
    throw new TypeError(`${fn} arg opts.gatewayOptions cannot be falsy.`);
  }
  if (!gatewayOptions.wallet) {
    throw new TypeError(`${fn} arg opts.gatewayOptions.wallet cannot be falsy`);
  }

  const createAssetResponse = await apiClient.runTransactionV1({
    signingCredential: gatewayOptions.wallet
      .keychain as FabricSigningCredential,
    channelName: ledgerChannelName,
    invocationType: FabricContractInvocationType.Send,
    contractName: ledgerContractName,
    methodName: "CreateAsset",
    params: [assetName, "green", "111", "someOwner", "299"],
  });
  expect(createAssetResponse).toBeTruthy();
  expect(createAssetResponse.status).toEqual(200);
  expect(createAssetResponse.data).toBeTruthy();
  const txId = createAssetResponse.data.transactionId;
  expect(txId).toBeTruthy();

  log.debug("Crated new transaction, txId:", txId);
  return txId;
}
