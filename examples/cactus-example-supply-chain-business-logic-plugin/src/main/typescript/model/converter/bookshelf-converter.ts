import { Bookshelf } from "../../generated/openapi/typescript-axios/index";

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
  public static ofSolidityStruct(arr: any[]): Bookshelf {
    return {
      id: arr[BookshelfConverter.SOLIDITY_FIELD_ID],
      shelfCount: arr[BookshelfConverter.SOLIDITY_FIELD_SHELF_COUNT],
      bambooHarvestId: arr[BookshelfConverter.SOLIDITY_FIELD_BAMBOO_HARVEST_ID],
    };
  }

  public static ofSolidityStructList(arrayOfArrays: any[][]): Bookshelf[] {
    return arrayOfArrays.map(BookshelfConverter.ofSolidityStruct);
  }
}
