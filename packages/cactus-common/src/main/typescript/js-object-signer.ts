import { Logger } from "./logging/logger";
import { LoggerProvider } from "./logging/logger-provider";
import { LogLevelDesc } from "loglevel";

import secp256k1 from "secp256k1";
import sha3 from "sha3";
import stringify from "json-stable-stringify";

export type SignatureFunction = (msg: unknown, pkey: Uint8Array) => Uint8Array;
export type VerifySignatureFunction = (
  msg: unknown,
  signature: Uint8Array,
  pubKey: Uint8Array,
) => boolean;
export type HashFunction = (data: unknown) => string;

export interface IJsObjectSignerOptions {
  privateKey: Uint8Array | string;
  signatureFunc?: SignatureFunction;
  verifySignatureFunc?: VerifySignatureFunction;
  hashFunc?: HashFunction;
  logLevel?: LogLevelDesc;
}

export class JsObjectSigner {
  private privateKey: Uint8Array;
  private signatureFunc?: SignatureFunction;
  private verifySignatureFunc?: VerifySignatureFunction;
  private hashFunc?: HashFunction;
  private readonly logger: Logger;

  constructor(public readonly options: IJsObjectSignerOptions) {
    if (!options) {
      throw new Error(`JsObjectSigner#ctor options falsy.`);
    }
    if (!options.privateKey) {
      throw new Error(`JsObjectSigner#ctor options.privateKey falsy.`);
    }

    // allows for private keys to passed as strings, but will automatically convert them to byte arrays for consistency
    // type check is needed to satisfy compiler
    if (typeof options.privateKey === "string") {
      this.privateKey = Buffer.from(options.privateKey, `hex`);
    } else {
      this.privateKey = options.privateKey;
    }

    this.signatureFunc = options.signatureFunc;
    this.verifySignatureFunc = options.verifySignatureFunc;
    this.hashFunc = options.hashFunc;

    this.logger = LoggerProvider.getOrCreate({
      label: "js-object-signer",
      level: options.logLevel || "INFO",
    });
  }

  /**
   * Generate signature from formated message
   * @param msg
   * @returns Generated signature
   */
  public sign(msg: unknown): Uint8Array {
    this.logger.debug("Message to sign: " + stringify(msg));

    if (this.signatureFunc) {
      return this.signatureFunc(msg, this.privateKey);
    } else {
      let hashMsg: string;
      if (this.hashFunc) {
        hashMsg = this.hashFunc(msg);
      } else {
        hashMsg = this.dataHash(msg);
      }

      const signObj = secp256k1.ecdsaSign(
        Buffer.from(hashMsg, `hex`),
        this.privateKey,
      );
      return signObj.signature;
    }
  }

  /**
   * Verify if a signature corresponds to given message and public key
   * @param msg
   * @param pubKey
   * @param signature
   * @returns {boolean}
   */
  public verify(
    msg: unknown,
    signature: Uint8Array,
    pubKey: Uint8Array,
  ): boolean {
    if (this.verifySignatureFunc) {
      return this.verifySignatureFunc(msg, signature, pubKey);
    }
    return secp256k1.ecdsaVerify(
      signature,
      Buffer.from(this.dataHash(msg), `hex`),
      pubKey,
    );
  }

  /**
   * Format message to be signed
   * @param data
   * @returns {string}
   */
  private dataHash(data: unknown): string {
    const hashObj = new sha3.SHA3Hash(256);
    hashObj.update(stringify(data));
    const hashMsg = hashObj.digest(`hex`);
    return hashMsg;
  }
}
