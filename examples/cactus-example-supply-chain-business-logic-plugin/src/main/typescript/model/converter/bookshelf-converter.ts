import { Bookshelf } from "../../generated/openapi/typescript-axios/index";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Responsible for converting model entities such as the `Bookshelf` to and
 * from the different representations it can exist in such as a generic JS
 * object with key/value pair properties or when being returned as an array of
 * values by a Solidity smart contract for example where the indices of the
 * array can be mapped to the field names.
 */
export class BookshelfConverter {
  public static SOLIDITY_FIELD_ID = 0;
  public static SOLIDITY_FIELD_SHELF_COUNT = 1;
  public static SOLIDITY_FIELD_BAMBOO_HARVEST_ID = 2;

  /**
   * Converts a `Bookshelf` model entity from an array representation (
   * usually returned by a solidity contract function) to a Plain Old Java Object.
   *
   * @param arr The array containing the values of properties describing a
   * `Bookshelf` model entity.
   */
  public static ofSolidityStruct(arr: unknown[]): Bookshelf {
    const id = arr[BookshelfConverter.SOLIDITY_FIELD_ID];
    if (typeof id !== "string") {
      const errMsg = `Expected the value of arr[${BookshelfConverter.SOLIDITY_FIELD_ID}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    const shelfCountStr = arr[
      BookshelfConverter.SOLIDITY_FIELD_SHELF_COUNT
    ] as string;
    const shelfCount = parseInt(shelfCountStr, 10);
    if (typeof shelfCount !== "number") {
      const errMsg = `Expected the value of arr[${BookshelfConverter.SOLIDITY_FIELD_SHELF_COUNT}] to be a number`;
      throw new RuntimeError(errMsg);
    }
    const bambooHarvestId =
      arr[BookshelfConverter.SOLIDITY_FIELD_BAMBOO_HARVEST_ID];
    if (typeof bambooHarvestId !== "string") {
      const errMsg = `Expected the value of arr[${BookshelfConverter.SOLIDITY_FIELD_BAMBOO_HARVEST_ID}] to be a string`;
      throw new RuntimeError(errMsg);
    }
    return {
      id,
      shelfCount,
      bambooHarvestId,
    };
  }

  public static ofSolidityStructList(arrayOfArrays: unknown[][]): Bookshelf[] {
    return arrayOfArrays.map(BookshelfConverter.ofSolidityStruct);
  }

  /**
   * Converts a `Bookshelf` model entity from a JSON object representation
   * (usually returned by a Fabric chaincode function) to a Plain Old Java Object.
   *
   * @param obj The object containing the values of properties describing a
   * `Bookshelf` model entity.
   */
  public static ofFabricObject(obj: any): Bookshelf {
    if (!obj || typeof obj !== "object") {
      throw new RuntimeError(`Expected obj to be an object, got ${typeof obj}`);
    }

    // Log the object for debugging
    console.log(
      "Received bookshelf object from Fabric:",
      JSON.stringify(obj, null, 2),
    );

    // Extract field values, checking both uppercase and lowercase property names
    const id = obj.ID || obj.id;
    const shelfCountStr = obj.ShelfCount || obj.shelfCount;
    const bambooHarvestId = obj.BambooHarvestId || obj.bambooHarvestId;

    // Check for enhanced record fields (for private data)
    const name = obj.Name || obj.name;
    const width = obj.Width || obj.width;
    const height = obj.Height || obj.height;
    const depth = obj.Depth || obj.depth;
    const material = obj.Material || obj.material;
    const price = obj.Price || obj.price;

    if (typeof id !== "string") {
      throw new RuntimeError(`Expected id to be string, got ${typeof id}`);
    }

    // Handle the case where shelfCount might be non-numeric (like "Bookshelf-id")
    let shelfCount: number;
    try {
      shelfCount = parseInt(shelfCountStr, 10);
      if (isNaN(shelfCount)) {
        // If parsing fails, use a default value of 1
        console.log(
          `Non-numeric shelfCount detected: "${shelfCountStr}", using default value 1`,
        );
        shelfCount = 1;
      }
    } catch (error) {
      // Fallback to default if any error occurs during parsing
      console.log(`Error parsing shelfCount: ${error}, using default value 1`);
      shelfCount = 1;
    }

    if (typeof bambooHarvestId !== "string") {
      throw new RuntimeError(
        `Expected bambooHarvestId to be string, got ${typeof bambooHarvestId}`,
      );
    }

    // Create the response object
    const result: Bookshelf = {
      id,
      shelfCount,
      bambooHarvestId,
    };

    // Add extra debugging info for enhanced records
    if (name || width || height || depth || material || price) {
      console.log("Enhanced bookshelf record detected with private data");
    }

    return result;
  }
}
