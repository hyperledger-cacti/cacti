import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";
import {
  Abi,
  PublicClient as ViemPublicClient,
  Transport,
  WatchContractEventParameters,
} from "viem";

const fn = "watch-events-v1-impl.ts";

export interface IWatchEventsV1ImplOptions {
  /** Logging level for debugging or monitoring purposes */
  readonly logLevel?: LogLevelDesc;

  readonly viemClient: ViemPublicClient;

  /** Additional filters for contract event subscription such as contract address, block range, etc. */
  readonly watchArgs: WatchContractEventParameters<
    Abi,
    string,
    undefined,
    Transport
  >;
}

/**
 * Validates the input options for the event watcher function.
 * Throws an error if any required parameter is missing.
 *
 * @param opts - Unknown input to be validated
 * @throws Error if any required property is missing or opts is not an object
 */
export function validateInput(
  opts: unknown,
): asserts opts is IWatchEventsV1ImplOptions {
  if (!opts || typeof opts !== "object")
    throw new Error("opts must be a non-null object");
  const typedOpts = opts as Partial<IWatchEventsV1ImplOptions>;
  if (!typedOpts.logLevel) throw new Error("logLevel is required");
  if (!typedOpts.viemClient) throw new Error("viemClient is required");
  if (!typedOpts.watchArgs) throw new Error("watchArgs is required");
  if (!typedOpts.watchArgs.abi) throw new Error("watchArgs.abi is required");
}

/**
 * Watches for Solidity smart contract events using the Viem client.
 *
 * @param opts - Configuration options including client, ABI, event name, and optional filters
 * @returns WatchContractEventReturnType - A function that can be used to stop watching events
 */
export async function watchEventsV1Impl(
  opts: IWatchEventsV1ImplOptions,
): Promise<{
  readonly unwatch: () => void;
}> {
  validateInput(opts);
  const { viemClient: client, logLevel = "INFO", watchArgs } = opts;

  const log = LoggerProvider.getOrCreate({ level: logLevel, label: fn });
  log.debug("ENTER");

  const unwatch = client.watchContractEvent(watchArgs);
  log.debug("Viem Client watchContractEvent invocation OK");

  return { unwatch };
}
