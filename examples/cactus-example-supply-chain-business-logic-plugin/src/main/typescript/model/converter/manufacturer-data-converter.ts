import { ManufacturerData } from "../../generated/openapi/typescript-axios/api";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Responsible for converting model entities such as the `ManufacturerData` to and
 * from the different representations it can exist in such as a generic JS
 * object with key/value pair properties or when being returned as an array of
 * values by a Fabric chaincode.
 */
export class ManufacturerDataConverter {
  public static FABRIC_FIELD_ID = 0;
  public static FABRIC_FIELD_NAME = 1;
  public static FABRIC_FIELD_COST_PRICE = 2;
  public static FABRIC_FIELD_INVENTORY = 3;
  public static FABRIC_FIELD_SUPPLIER_INFO = 4;
  public static FABRIC_FIELD_SHIPPING_ADDRESS = 5;
  public static FABRIC_FIELD_CUSTOMER_CONTACT = 6;

  /**
   * Converts a `ManufacturerData` model entity from an object representation
   * (usually returned by a Fabric chaincode function) to a Plain Old Java Object.
   *
   * @param data The object containing the values of properties describing a
   * `ManufacturerData` model entity.
   */
  public static ofFabricArray(data: any): ManufacturerData {
    if (!data || typeof data !== "object") {
      throw new RuntimeError(
        `Expected data to be an object, got ${typeof data}`,
      );
    }

    // Log the object for debugging
    console.log(
      "Received manufacturer data from Fabric:",
      JSON.stringify(data, null, 2),
    );

    // Extract field values, checking both uppercase and lowercase property names
    const id = data.ID || data.id;
    const name = data.Name || data.name;
    const costPrice = data.CostPrice || data.costPrice;
    const inventory = data.Inventory || data.inventory;
    const supplierInfo = data.SupplierInfo || data.supplierInfo;
    const shippingAddress = data.ShippingAddress || data.shippingAddress;
    const customerContact = data.CustomerContact || data.customerContact;
    const shipmentId = data.ShipmentId || data.shipmentId;

    // Add fields for extended private data
    const privateProductNotes =
      data.PrivateProductNotes || data.privateProductNotes;
    const privatePricingStrategy =
      data.PrivatePricingStrategy || data.privatePricingStrategy;

    if (typeof id !== "string") {
      throw new RuntimeError(`Expected id to be string, got ${typeof id}`);
    }

    if (typeof name !== "string") {
      throw new RuntimeError(`Expected name to be string, got ${typeof name}`);
    }

    const costPriceNum = parseFloat(costPrice);
    if (isNaN(costPriceNum)) {
      throw new RuntimeError(`Invalid cost price: ${costPrice}`);
    }

    const inventoryNum = parseInt(inventory, 10);
    if (isNaN(inventoryNum)) {
      throw new RuntimeError(`Invalid inventory: ${inventory}`);
    }

    if (typeof supplierInfo !== "string") {
      throw new RuntimeError(
        `Expected supplierInfo to be string, got ${typeof supplierInfo}`,
      );
    }

    if (typeof shippingAddress !== "string") {
      throw new RuntimeError(
        `Expected shippingAddress to be string, got ${typeof shippingAddress}`,
      );
    }

    if (typeof customerContact !== "string") {
      throw new RuntimeError(
        `Expected customerContact to be string, got ${typeof customerContact}`,
      );
    }

    // Create result object
    const result: ManufacturerData = {
      id,
      name,
      costPrice: costPriceNum,
      inventory: inventoryNum,
      supplierInfo,
      shippingAddress,
      customerContact,
      shipmentId: shipmentId || undefined,
      privateNotes:
        data.PrivateNotes ||
        data.privateNotes ||
        `Manufacturer Info - Cost: ${costPrice}, Inventory: ${inventory}, Supplier: ${supplierInfo}`,
    };

    // Add debug logging for private data
    if (privateProductNotes || privatePricingStrategy) {
      console.log("Enhanced manufacturer data detected with private fields");
    }

    return result;
  }

  public static ofFabricArrayList(dataArray: any[]): ManufacturerData[] {
    return dataArray.map(ManufacturerDataConverter.ofFabricArray);
  }
}
