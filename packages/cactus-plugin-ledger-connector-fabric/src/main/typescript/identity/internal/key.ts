import { ICryptoKey } from "fabric-common";
import { InternalIdentityClient } from "./client";
import { CryptoUtil } from "./crypto-util";

// internal class used by cryptoSuite, this is just to support interface provided by
// fabric-sdk-node
export class Key implements ICryptoKey {
  constructor(
    private readonly keyName: string,
    private readonly client: InternalIdentityClient,
  ) {}
  async sign(digest: Buffer): Promise<Buffer> {
    const { sig, crv } = await this.client.sign(this.keyName, digest);
    return CryptoUtil.encodeASN1Sig(sig, crv);
  }

  /**
   * @description generate a csr
   * @param commonName
   * @returns pem encoded csr string
   */
  async generateCSR(commonName: string): Promise<string> {
    const pub = await this.client.getPub(this.keyName);
    const csr = CryptoUtil.createCSR(pub, commonName);
    const digest = CryptoUtil.getCSRDigest(csr);
    const { sig } = await this.client.sign(this.keyName, digest);
    return CryptoUtil.getPemCSR(csr, sig);
  }

  /**
   * @description will rotate the key
   */
  async rotate(): Promise<void> {
    await this.client.rotateKey(this.keyName);
  }
  getSKI(): string {
    throw new Error("Key::getSKI not-required");
  }
  getHandle(): string {
    throw new Error("Key::getHandle not-required");
  }
  isSymmetric(): boolean {
    throw new Error("Key::isSymmetric not-required");
  }
  isPrivate(): boolean {
    throw new Error("Key::isPrivate not-required");
  }
  getPublicKey(): ICryptoKey {
    throw new Error("Key::getPublicKey not-required");
  }
  toBytes(): string {
    throw new Error("Key::toBytes not-required");
  }
}
