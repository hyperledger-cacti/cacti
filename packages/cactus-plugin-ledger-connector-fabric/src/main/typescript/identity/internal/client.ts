import { KJUR } from "jsrsasign";
import { ECCurveType } from "./crypto-util";

export interface ISignatureResponse {
  sig: Buffer;
  crv: ECCurveType;
}

// class that all the identity provider should implement
export abstract class InternalIdentityClient {
  /**
   * @description send message digest to the client for it to be signed by the private key stored with the client
   * @param keyName , label of the key
   * @param digest : messages digest which need to signed (NOTE : digest will already be hashed)
   * @returns asn1 encoded signature
   */
  abstract sign(keyName: string, digest: Buffer): Promise<ISignatureResponse>;

  /**
   * @description get the the public key from the client
   * @param keyName for which public key should be returned
   * @returns ECDSA key only p256 and p384 curve are supported
   */
  abstract getPub(keyName: string): Promise<KJUR.crypto.ECDSA>;

  /**
   * @description will rotate a given key
   * @param keyName label of key that need to be rotated
   */
  abstract rotateKey(keyName: string): Promise<void>;
}
