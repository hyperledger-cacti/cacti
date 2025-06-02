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

  const isValidHex = (str: string) =>
    typeof str === "string" && /^0x[0-9a-fA-F]+$/.test(str) && str.length >= 10;

  if (!isValidHex(publicKey) || !isValidHex(privateKey)) {
    throw new TypeError(
      `Invalid config.keyPair values: ${JSON.stringify(opts.configValue)}. 'publicKey' and 'privateKey' must be valid hex strings (e.g. starting with 0x and containing only hex digits).`,
    );
  }
  return opts.configValue as KeyPairJSON;
}
