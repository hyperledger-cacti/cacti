import CryptoMaterial from "../../../../crypto-material/crypto-material.json";

export function getUserFromPseudonim(user: string): string {
  switch (user) {
    case "alice":
      return "userA";
    case "charlie":
      return "userB";
    case "bob":
      return "bridge";
    default:
      throw Error("Invalid user provided");
  }
}

export function getFabricId(user: string): string {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].fabricID;
    case "userB":
      return CryptoMaterial.accounts["userB"].fabricID;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].fabricID;
    default:
      throw Error("Invalid user provided");
  }
}

export function getEthAddress(user: string): string {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].ethAddress;
    case "userB":
      return CryptoMaterial.accounts["userB"].ethAddress;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].ethAddress;
    default:
      throw Error("Invalid user provided");
  }
}

export function getPrvKey(user: string): string {
  switch (getUserFromPseudonim(user)) {
    case "userA":
      return CryptoMaterial.accounts["userA"].privateKey;
    case "userB":
      return CryptoMaterial.accounts["userB"].privateKey;
    case "bridge":
      return CryptoMaterial.accounts["bridge"].privateKey;
    default:
      throw Error("Invalid user provided");
  }
}

export function assertEqual(value_1: unknown, value_2: unknown) {
  if (value_1 !== value_2) {
    throw Error(`Expected ${value_1} to be equal to ${value_2}`);
  }
}

export function assertStringContains(
  mainString: string,
  subString: string,
): void {
  if (!mainString.includes(subString)) {
    throw new Error(`String "${mainString}" does not contain "${subString}"`);
  }
}

export function assertNonNullish<TValue>(
  value: TValue,
): asserts value is NonNullable<TValue> {
  if (value === null || value === undefined) {
    throw Error(`${value} was expected to be non-null`);
  }
}
