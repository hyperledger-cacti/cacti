import { BambooHarvest } from "../../generated/openapi/typescript-axios";

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
  public static ofSolidityStruct(arr: any[]): BambooHarvest {
    return {
      id: arr[BambooHarvestConverter.SOLIDITY_FIELD_ID],
      location: arr[BambooHarvestConverter.SOLIDITY_FIELD_LOCATION],
      startedAt: arr[BambooHarvestConverter.SOLIDITY_FIELD_STARTED_AT],
      endedAt: arr[BambooHarvestConverter.SOLIDITY_FIELD_ENDED_AT],
      harvester: arr[BambooHarvestConverter.SOLIDITY_FIELD_HARVESTER],
    };
  }

  public static ofSolidityStructList(arrayOfArrays: any[][]): BambooHarvest[] {
    return arrayOfArrays.map(BambooHarvestConverter.ofSolidityStruct);
  }
}
