/**
 * Helper factory functions to simplify construction of complex input values used by the upstream Iroha V2 SDK.
 */

import {
  AssetDefinitionId,
  DomainId,
  Metadata,
  Name as IrohaName,
  Value as IrohaValue,
  AssetId,
  AccountId,
  AssetValue,
} from "@iroha2/data-model";

/**
 * JS types that can be converted to IrohaV2 `AssetValue`
 */
export type AssetValueInput = number | bigint | string | Metadata;

/**
 * JS types that can be converted to IrohaV2 `IrohaValue`
 */
export type IrohaValueInput = number | bigint | string | Metadata;

/**
 * Convert JS value into matching `AssetValue`
 *
 * @param value
 * @returns AssetValue
 */
export function createAssetValue(value: AssetValueInput): AssetValue {
  switch (typeof value) {
    case "number":
      return AssetValue("Quantity", value);
    case "bigint":
      return AssetValue("BigQuantity", value);
    case "string":
      return AssetValue("Fixed", value);
    case "object":
      return AssetValue("Store", value);
    default:
      throw new Error(`Unknown AssetValue: ${value}, type: ${typeof value}`);
  }
}

/**
 * Convert JS value into matching `IrohaValue`
 *
 * @param value
 * @returns IrohaValue
 */
export function createIrohaValue(value: IrohaValueInput): IrohaValue {
  switch (typeof value) {
    case "number":
      return IrohaValue("U32", value);
    case "bigint":
      return IrohaValue("U128", value);
    case "string":
      return IrohaValue("Fixed", value);
    case "object":
      return IrohaValue("LimitedMetadata", value);
    default:
      throw new Error(`Unknown IrohaValue: ${value}, type: ${typeof value}`);
  }
}

/**
 * Create `AccountId` from it's name and domain.
 *
 * @param accountName
 * @param domainName
 * @returns AccountId
 */
export function createAccountId(
  accountName: IrohaName,
  domainName: IrohaName,
): AccountId {
  return AccountId({
    name: accountName,
    domain_id: DomainId({
      name: domainName,
    }),
  });
}

/**
 * Create `AssetDefinitionId` from it's name and domain.
 *
 * @param assetName
 * @param domainName
 * @returns AssetDefinitionId
 */
export function createAssetDefinitionId(
  assetName: IrohaName,
  domainName: IrohaName,
): AccountId {
  return AssetDefinitionId({
    name: assetName,
    domain_id: DomainId({ name: domainName }),
  });
}

/**
 * Create `AssetId` from it's name and domain and account information.
 *
 * @param assetName
 * @param domainName
 * @returns AssetDefinitionId
 */
export function createAssetId(
  assetName: IrohaName,
  domainName: IrohaName,
  accountName: IrohaName,
  accountDomainName = domainName,
): AssetId {
  return AssetId({
    definition_id: createAssetDefinitionId(assetName, domainName),
    account_id: createAccountId(accountName, accountDomainName),
  });
}
