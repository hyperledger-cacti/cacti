export interface KeyPairJSON {
  privateKey: string;
  publicKey: string;
}

// Type guard for the keyPairJSON
export function iskeyPairJSON(obj: unknown): obj is KeyPairJSON {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "privateKey" in obj &&
    typeof (obj as Record<string, unknown>).privateKey === "string" &&
    "publicKey" in obj &&
    typeof (obj as Record<string, unknown>).publicKey === "string"
  );
}

export function validateSatpKeyPairJSON(opts: {
  readonly configValue: unknown;
}): KeyPairJSON | undefined {
  if (!opts || !opts.configValue) {
    return;
  }

  if (!iskeyPairJSON(opts.configValue)) {
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
