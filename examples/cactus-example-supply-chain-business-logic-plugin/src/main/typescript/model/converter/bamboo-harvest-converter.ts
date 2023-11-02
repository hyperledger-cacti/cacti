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
}
