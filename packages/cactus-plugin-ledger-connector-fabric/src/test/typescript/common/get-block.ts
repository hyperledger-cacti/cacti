import { Logger } from "@hyperledger/cactus-common";
import {
  GatewayOptions,
  GetBlockRequestV1Query,
  GetBlockResponseTypeV1,
  DefaultApi as FabricApi,
} from "../../../main/typescript/generated/openapi/typescript-axios/api";

/**
 * Run get block endpoint using a query, do basic response checks.
 * Can be reused throughout the tests.
 *
 * @param query how to find requested block
 * @param responseType response type requested
 *
 * @returns block object / block buffer
 */
export async function getBlock(opts: {
  readonly query: GetBlockRequestV1Query;
  readonly responseType?: GetBlockResponseTypeV1;
  readonly gatewayOptions: GatewayOptions;
  readonly log: Logger;
  readonly apiClient: FabricApi;
  readonly ledgerChannelName: string;
}): Promise<any> {
  const {
    responseType = GetBlockResponseTypeV1.Full,
    ledgerChannelName,
    gatewayOptions,
    query,
    log,
    apiClient,
  } = opts;

  const getBlockReq = {
    channelName: ledgerChannelName,
    gatewayOptions,
    query,
    responseType,
  };

  const getBlockResponse = await apiClient.getBlockV1(getBlockReq);
  log.debug(
    "getBlockResponse = ",
    getBlockResponse.status,
    getBlockResponse.data,
  );

  expect(getBlockResponse).toBeTruthy();
  expect(getBlockResponse.status).toEqual(200);
  expect(getBlockResponse.data).toBeTruthy();

  switch (responseType) {
    case GetBlockResponseTypeV1.Full:
      if (!("decodedBlock" in getBlockResponse.data)) {
        throw new Error(
          `Wrong response received - expected decoded, got: ${getBlockResponse.data}`,
        );
      }
      expect(getBlockResponse.data.decodedBlock).toBeTruthy();
      return getBlockResponse.data.decodedBlock;
    case GetBlockResponseTypeV1.Encoded:
      if (!("encodedBlock" in getBlockResponse.data)) {
        throw new Error(
          `Wrong response received - expected encoded, got: ${getBlockResponse.data}`,
        );
      }
      expect(getBlockResponse.data.encodedBlock).toBeTruthy();
      return getBlockResponse.data.encodedBlock;
    case GetBlockResponseTypeV1.CactiTransactions:
      if (!("cactiTransactionsEvents" in getBlockResponse.data)) {
        throw new Error(
          `Wrong response received - expected CactiTransactions, got: ${getBlockResponse.data}`,
        );
      }
      expect(getBlockResponse.data.cactiTransactionsEvents).toBeTruthy();
      return getBlockResponse.data.cactiTransactionsEvents;
    case GetBlockResponseTypeV1.CactiFullBlock:
      if (!("cactiFullEvents" in getBlockResponse.data)) {
        throw new Error(
          `Wrong response received - expected CactiFullBlock, got: ${getBlockResponse.data}`,
        );
      }
      expect(getBlockResponse.data.cactiFullEvents).toBeTruthy();
      return getBlockResponse.data.cactiFullEvents;
    default:
      // Will not compile if any type was not handled by above switch.
      const unknownType: never = responseType;
      const validTypes = Object.keys(GetBlockResponseTypeV1).join(";");
      const errorMessage = `Unknown get block response type '${unknownType}'. Accepted types for GetBlockResponseTypeV1 are: [${validTypes}]`;
      throw new Error(errorMessage);
  }
}
