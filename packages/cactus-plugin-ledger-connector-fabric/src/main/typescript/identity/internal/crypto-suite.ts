import { ICryptoSuite, ICryptoKey } from "fabric-common";
import { createHash } from "crypto";
import { Key } from "./key";
import { Utils } from "fabric-common";

// InternalCryptoSuite : a class which will be implemented by identity provider
// some of the function are just to support the interface provided by the fabric-sdk-node
export class InternalCryptoSuite implements ICryptoSuite {
  createKeyFromRaw(pem: string): ICryptoKey {
    return Utils.newCryptoSuite().createKeyFromRaw(pem);
  }
  decrypt(): Buffer {
    throw new Error("InternalCryptoSuite::decrypt : not required!!");
  }
  deriveKey(): ICryptoKey {
    throw new Error("InternalCryptoSuite::deriveKey : not required!!");
  }
  encrypt(): Buffer {
    throw new Error("InternalCryptoSuite::encrypt : not required!!");
  }
  getKey(): Promise<ICryptoKey> {
    throw new Error("InternalCryptoSuite::getKey : not required!!");
  }
  getKeySize(): number {
    throw new Error("InternalCryptoSuite::getKeySize : not required!!");
  }
  generateKey(): Promise<ICryptoKey> {
    throw new Error("InternalCryptoSuite::generateKey : not required!!");
  }
  hash(msg: string): string {
    return createHash("sha256").update(msg).digest("hex");
  }
  importKey(): ICryptoKey | Promise<ICryptoKey> {
    throw new Error("InternalCryptoSuite::importKey : not required!!");
  }
  setCryptoKeyStore(): void {
    throw new Error("InternalCryptoSuite::setCryptoKeyStore : not required!!");
  }
  async sign(key: Key, digest: Buffer): Promise<Buffer> {
    return await key.sign(digest);
  }
  verify(): boolean {
    throw new Error("InternalCryptoSuite::verify : not required!!");
  }
}
