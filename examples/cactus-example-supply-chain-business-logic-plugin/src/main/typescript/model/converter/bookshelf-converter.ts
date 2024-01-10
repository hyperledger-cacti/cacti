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
}
