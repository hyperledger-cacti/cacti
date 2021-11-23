export interface IKeyPair {
  publicKey: string;
  privateKey: string;
}

export function isIKeyPair(
  allegedKeyPair: IKeyPair,
): allegedKeyPair is IKeyPair {
  return (
    typeof allegedKeyPair.privateKey === "string" &&
    typeof allegedKeyPair.publicKey === "string" &&
    allegedKeyPair.privateKey.length > 0 &&
    allegedKeyPair.publicKey.length > 0
  );
}
