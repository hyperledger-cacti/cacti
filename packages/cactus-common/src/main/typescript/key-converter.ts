import KeyEncoder from "key-encoder";

export enum KeyFormat {
  Raw = "raw",
  Hex = "hex",
  PEM = "pem",
}

export class KeyConverter {
  private keyEncoder: KeyEncoder;

  public readonly supportedKeyFormats: string[];

  constructor() {
    this.supportedKeyFormats = Object.values(KeyFormat);
    this.keyEncoder = new KeyEncoder("secp256k1");
  }

  /**
   * Convert public key from one format to another format
   * @param key
   * @param fromFormat
   * @param toFormat
   */
  public publicKeyAs(
    key: string | Uint8Array,
    fromFormat: KeyFormat,
    toFormat: KeyFormat,
  ): string | Uint8Array {
    this.validateKeyFormatValue(fromFormat);
    this.validateKeyFormatValue(toFormat);

    let keyValue = "";
    let convertToRaw = false;

    if (key instanceof Uint8Array) {
      keyValue = Buffer.from(key).toString("hex");
    } else {
      keyValue = key;
    }

    if (fromFormat === KeyFormat.Hex) {
      fromFormat = KeyFormat.Raw;
    }

    if (toFormat === KeyFormat.Raw) {
      convertToRaw = true;
    } else if (toFormat === KeyFormat.Hex) {
      toFormat = KeyFormat.Raw;
    }

    let resultKey: string | Uint8Array = this.keyEncoder.encodePublic(
      keyValue,
      fromFormat,
      toFormat,
    );

    if (convertToRaw) {
      resultKey = Uint8Array.from(Buffer.from(resultKey, "hex"));
    }

    return resultKey;
  }

  /**
   * Convert private key from one format to another format
   * @param key
   * @param fromFormat
   * @param toFormat
   */
  public privateKeyAs(
    key: string | Buffer,
    fromFormat: KeyFormat,
    toFormat: KeyFormat,
  ): string | Buffer {
    this.validateKeyFormatValue(fromFormat);
    this.validateKeyFormatValue(toFormat);

    let keyValue = key;
    let convertToRaw = false;

    if (fromFormat === KeyFormat.Raw) {
      if (key instanceof Buffer) {
        keyValue = key.toString("hex");
      }
    } else if (fromFormat === KeyFormat.Hex) {
      fromFormat = KeyFormat.Raw;
    }

    if (toFormat === KeyFormat.Raw) {
      convertToRaw = true;
    } else if (toFormat === KeyFormat.Hex) {
      toFormat = KeyFormat.Raw;
    }

    let resultKey: string | Buffer = this.keyEncoder.encodePrivate(
      keyValue,
      fromFormat,
      toFormat,
    );

    if (convertToRaw) {
      resultKey = Buffer.from(resultKey, "hex");
    }

    return resultKey;
  }

  /**
   * This method will validate if the input key format match to one of the enum value.
   * @param keyFormat
   */
  private validateKeyFormatValue(keyFormat: KeyFormat): void {
    const fnTag = "KeyConverter#publicKeyAs()";

    if (!this.supportedKeyFormats.some((val) => val === keyFormat)) {
      const csv =
        this.supportedKeyFormats.join(", ") +
        ` => (` +
        Object.keys(KeyFormat)
          .map((f) => `KeyFormat.${f}`)
          .join(", ") +
        `)`;
      const msg = `${fnTag} Invalid KeyFormat ${keyFormat} Supported: (${csv})`;
      throw new Error(msg);
    }
  }
}
