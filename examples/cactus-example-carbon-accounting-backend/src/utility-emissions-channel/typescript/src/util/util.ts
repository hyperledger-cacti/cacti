import { Shim } from "fabric-shim";

// logger : provide global logger for logging
export const logger = Shim.newLogger("EMISSION_RECORD_CHAINCODE");

const encoder = new TextEncoder();

export const stringToBytes = (msg: string): Uint8Array => {
  return encoder.encode(msg);
};
