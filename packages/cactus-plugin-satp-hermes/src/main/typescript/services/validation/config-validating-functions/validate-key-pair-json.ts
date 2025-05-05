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
  return opts.configValue as KeyPairJSON;
}
