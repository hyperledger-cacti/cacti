import { ISignerKeyPair } from "@hyperledger/cactus-common";

export function getUint8Key(key: ISignerKeyPair) {
  return {
    publicKey: Buffer.isBuffer(key.publicKey)
      ? new Uint8Array(key.publicKey)
      : typeof key.publicKey === "string"
        ? new Uint8Array(Buffer.from(key.publicKey, "base64"))
        : key.publicKey,
    privateKey: Buffer.isBuffer(key.privateKey)
      ? new Uint8Array(key.privateKey)
      : typeof key.privateKey === "string"
        ? new Uint8Array(Buffer.from(key.privateKey, "base64"))
        : key.privateKey,
  };
}
