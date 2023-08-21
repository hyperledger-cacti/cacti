import crypto from "crypto";
import secp256k1 from "secp256k1";

export interface ISignerKeyPair {
  privateKey: Buffer;
  publicKey: Uint8Array;
}

export class Secp256k1Keys {
  /**
   * Generate random private and public secp256k1 key in Buffer format
   * @return Generated key pair
   */
  static generateKeyPairsBuffer(): ISignerKeyPair {
    let privKey: Buffer;
    // generate secp256K1 private key
    do {
      privKey = crypto.randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privKey));

    // generate secp256K1 public key
    const pubKey = secp256k1.publicKeyCreate(privKey);

    return { privateKey: privKey, publicKey: pubKey };
  }
}
