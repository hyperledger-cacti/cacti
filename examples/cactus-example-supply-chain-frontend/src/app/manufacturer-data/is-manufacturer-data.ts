import { ManufacturerData } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

export function isManufacturerData(
  x: unknown | ManufacturerData,
): x is ManufacturerData {
  if (x == null) {
    return false;
  }

  const typed = x as Record<string, unknown>;

  const hasId = typeof typed.id === "string";
  const hasName = typeof typed.name === "string";

  // Check costPrice - could be number or string (that can be parsed as number)
  const hasCostPrice =
    typeof typed.costPrice === "number" ||
    (typeof typed.costPrice === "string" &&
      !isNaN(parseFloat(typed.costPrice)));

  // Check inventory - could be number or string (that can be parsed as number)
  const hasInventory =
    typeof typed.inventory === "number" ||
    (typeof typed.inventory === "string" &&
      !isNaN(parseFloat(typed.inventory)));

  const hasSupplierInfo = typeof typed.supplierInfo === "string";
  const hasShippingAddress = typeof typed.shippingAddress === "string";
  const hasCustomerContact = typeof typed.customerContact === "string";

  return (
    hasId &&
    hasName &&
    hasCostPrice &&
    hasInventory &&
    hasSupplierInfo &&
    hasShippingAddress &&
    hasCustomerContact
  );
}
