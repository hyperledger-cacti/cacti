import Web3, { AbiEventFragment, DecodedParams } from "web3";
import { SolidityEventLog } from "./types/util-types";

/**
 * Decodes a log event using Web3 and ABI.
 *
 * @param log - The log object from Ethereum (topics and data).
 * @param abi - The full ABI array of the contract.
 * @param eventName - The name of the event you want to decode.
 * @returns Decoded event parameters as an object, or null if not found.
 */
export function decodeEvent(
  web3: InstanceType<typeof Web3>,
  log: SolidityEventLog,
  abi: AbiEventFragment[],
  eventName: string,
): DecodedParams | null {
  const eventAbi = abi.find(
    (item) => item.type === "event" && item.name === eventName,
  );

  if (!eventAbi) {
    console.error(`Event "${eventName}" not found in ABI.`);
    return null;
  }

  try {
    const decoded = web3.eth.abi.decodeLog(
      eventAbi.inputs as AbiEventFragment[],
      log.data,
      log.topics.slice(1), // skip topic[0], which is the event signature
    );

    return decoded;
  } catch (error) {
    console.error("Failed to decode event log:", error);
    return null;
  }
}
