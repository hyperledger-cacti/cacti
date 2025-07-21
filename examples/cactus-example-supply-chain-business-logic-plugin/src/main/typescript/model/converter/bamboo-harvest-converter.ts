import { BambooHarvest } from "../../generated/openapi/typescript-axios";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Responsible for converting model entities such as the `BambooHarvest` to and
 * from the different representations it can exist in such as a generic JS
 * object with key/value pair properties or when being returned as an array of
 * values by a Solidity smart contract for example where the indices of the
 * array can be mapped to the field names.
 */
export class BambooHarvestConverter {
  public static SOLIDITY_FIELD_ID = 0;
  public static SOLIDITY_FIELD_LOCATION = 1;
  public static SOLIDITY_FIELD_STARTED_AT = 2;
  public static SOLIDITY_FIELD_ENDED_AT = 3;
  public static SOLIDITY_FIELD_HARVESTER = 4;

  /**
   * Converts a `BambooHarvest` model entity from an array representation (
   * usually returned by a solidity contract function) to a Plain Old Java Object.
   *
   * @param arr The array containing the values of properties describing a
   * `BambooHarvest` model entity.
   */
  public static ofSolidityStruct(arr: unknown[]): BambooHarvest {
    const id = arr[BambooHarvestConverter.SOLIDITY_FIELD_ID];
    if (typeof id !== "string") {
      const errMsg = `Expected the value of arr[${BambooHarvestConverter.SOLIDITY_FIELD_ID}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    const location = arr[BambooHarvestConverter.SOLIDITY_FIELD_LOCATION];
    if (typeof location !== "string") {
      const errMsg = `Expected the value of arr[${BambooHarvestConverter.SOLIDITY_FIELD_LOCATION}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    const startedAt = arr[BambooHarvestConverter.SOLIDITY_FIELD_STARTED_AT];
    if (typeof startedAt !== "string") {
      const errMsg = `Expected the value of arr[${BambooHarvestConverter.SOLIDITY_FIELD_STARTED_AT}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    const endedAt = arr[BambooHarvestConverter.SOLIDITY_FIELD_ENDED_AT];
    if (typeof endedAt !== "string") {
      const errMsg = `Expected the value of arr[${BambooHarvestConverter.SOLIDITY_FIELD_ENDED_AT}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    const harvester = arr[BambooHarvestConverter.SOLIDITY_FIELD_HARVESTER];
    if (typeof harvester !== "string") {
      const errMsg = `Expected the value of arr[${BambooHarvestConverter.SOLIDITY_FIELD_HARVESTER}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    return {
      id,
      location,
      startedAt,
      endedAt,
      harvester,
    };
  }

  public static ofSolidityStructList(
    arrayOfArrays: unknown[][],
  ): BambooHarvest[] {
    return arrayOfArrays.map(BambooHarvestConverter.ofSolidityStruct);
  }

  /**
   * Converts a `BambooHarvest` model entity from a JSON object representation
   * (usually returned by a Fabric chaincode function) to a Plain Old Java Object.
   *
   * @param obj The object containing the values of properties describing a
   * `BambooHarvest` model entity.
   */
  public static ofFabricObject(obj: any): BambooHarvest {
    if (!obj || typeof obj !== "object") {
      throw new RuntimeError(`Expected obj to be an object, got ${typeof obj}`);
    }

    // Log the object for debugging
    console.log("Received object from Fabric:", JSON.stringify(obj, null, 2));

    // Determine if this is a basic or enhanced record
    // Check both uppercase and lowercase property names
    const isEnhanced =
      obj.hasOwnProperty("FabricProductID") ||
      obj.hasOwnProperty("fabricProductId") ||
      obj.hasOwnProperty("Price") ||
      obj.hasOwnProperty("price") ||
      obj.hasOwnProperty("Status") ||
      obj.hasOwnProperty("status");

    if (isEnhanced) {
      // Handle enhanced record (from GetAllEnhancedRecords)
      // Extract field values, checking both uppercase and lowercase property names
      const id = obj.ID || obj.id;
      const location = obj.Location || obj.location;
      const harvestTime = obj.HarvestTime || obj.harvestTime;
      const fabricProductId = obj.FabricProductID || obj.fabricProductId || "";
      const status = obj.Status || obj.status || "";
      const price = obj.Price || obj.price || "";
      const bambooCount = obj.BambooCount || obj.bambooCount || "0";
      const acreage = obj.Acreage || obj.acreage || "0";

      // Generate an ID if it's undefined
      const finalId =
        id ||
        `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (typeof finalId !== "string") {
        throw new RuntimeError(
          `Expected ID to be string, got ${typeof finalId}`,
        );
      }

      if (typeof location !== "string") {
        throw new RuntimeError(
          `Expected Location to be string, got ${typeof location}`,
        );
      }

      // For enhanced records, we can include extra information in the description
      const harvester = fabricProductId
        ? `Manufacturer Product ID: ${fabricProductId}`
        : "Manufacturer";

      const priceInfo = price ? ` | Price: ${price}` : "";
      const statusInfo = status ? ` | Status: ${status}` : "";
      const fullDescription = harvester + priceInfo + statusInfo;

      return {
        id: finalId,
        location,
        startedAt: harvestTime || new Date().toISOString(),
        endedAt: harvestTime || new Date().toISOString(),
        harvester: fullDescription,
      };
    } else {
      // Handle basic record (from GetAllRecords)
      // Extract field values, checking both uppercase and lowercase property names
      const id = obj.ID || obj.id;
      const location = obj.Location || obj.location;
      const harvestTime = obj.HarvestTime || obj.harvestTime;
      const bambooCount = obj.BambooCount || obj.bambooCount || "0";
      const acreage = obj.Acreage || obj.acreage || "0";

      // Generate an ID if it's undefined
      const finalId =
        id ||
        `generated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (typeof finalId !== "string") {
        throw new RuntimeError(
          `Expected ID to be string, got ${typeof finalId}`,
        );
      }

      if (typeof location !== "string") {
        throw new RuntimeError(
          `Expected Location to be string, got ${typeof location}`,
        );
      }

      return {
        id: finalId,
        location,
        // Map harvestTime to startedAt/endedAt
        startedAt: harvestTime || new Date().toISOString(),
        endedAt: harvestTime || new Date().toISOString(),
        // Basic info for public view
        harvester: `Bamboo Count: ${bambooCount} | Acreage: ${acreage}`,
      };
    }
  }
}
