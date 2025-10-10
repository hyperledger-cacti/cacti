import { Logger } from "@hyperledger/cactus-common";

export interface KeyPairJSON {
  privateKey: string;
  publicKey: string;
}

// Type guard for the keyPairJSON
export function isKeyPairJSON(obj: unknown, log: Logger): obj is KeyPairJSON {
  if (typeof obj !== "object" || obj === null) {
    log.error("isKeyPairJSON: obj is not an object or is null");
    return false;
  } else if (!("privateKey" in obj)) {
    log.error("isKeyPairJSON: 'privateKey' property missing");
    return false;
  } else if (typeof (obj as Record<string, unknown>).privateKey !== "string") {
    log.error("isKeyPairJSON: 'privateKey' property is not a string");
    return false;
  } else if (!("publicKey" in obj)) {
    log.error("isKeyPairJSON: 'publicKey' property missing");
    return false;
  } else if (typeof (obj as Record<string, unknown>).publicKey !== "string") {
    log.error("isKeyPairJSON: 'publicKey' property is not a string");
    return false;
  }
  return true;
}

export function validateSatpKeyPairJSON(
  opts: {
    readonly configValue: unknown;
  },
  log: Logger,
): KeyPairJSON | undefined {
  if (!opts || !opts.configValue) {
    return;
  }

  if (!isKeyPairJSON(opts.configValue, log)) {
    throw new TypeError(
      `Invalid config.keyPair: ${JSON.stringify(opts.configValue)}. Expected a keyPair object with 'publicKey' and 'privateKey' string fields.`,
    );
  }

  const { publicKey, privateKey } = opts.configValue;

  const isValidHex = (str: string, len: number) =>
    /^[0-9a-fA-F]+$/.test(str) && str.length === len;

  if (!isValidHex(publicKey, 66) || !isValidHex(privateKey, 64)) {
    throw new TypeError(
      `Invalid config.keyPair: ${JSON.stringify(opts.configValue)}. 'publicKey' must be 66-character hex, 'privateKey' must be 64-character hex.`,
    );
  }
  return opts.configValue as KeyPairJSON;
}
