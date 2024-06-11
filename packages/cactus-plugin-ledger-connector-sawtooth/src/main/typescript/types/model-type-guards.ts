import {
  WatchBlocksV1CactiTransactionsResponse,
  WatchBlocksV1FullResponse,
} from "../generated/openapi/typescript-axios/api";

export function isWatchBlocksV1CactiTransactionsResponse(
  response: unknown,
): response is WatchBlocksV1CactiTransactionsResponse {
  const typedResponse = response as WatchBlocksV1CactiTransactionsResponse;
  return typeof typedResponse.cactiTransactionsEvents !== "undefined";
}

export function isWatchBlocksV1FullResponse(
  response: unknown,
): response is WatchBlocksV1FullResponse {
  const typedResponse = response as WatchBlocksV1FullResponse;
  return typeof typedResponse.fullBlock !== "undefined";
}
