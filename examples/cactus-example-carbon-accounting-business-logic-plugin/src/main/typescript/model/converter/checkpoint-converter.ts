import { Checkpoint } from "../../generated/openapi/typescript-axios";

/**
 * Responsible for converting model entities such as the `Checkpoint` to and
 * from the different representations it can exist in such as a generic JS
 * object with key/value pair properties or when being returned as an array of
 * values by a Solidity smart contract for example where the indices of the
 * array can be mapped to the field names.
 */
export class CheckpointConverter {
  public static SOLIDITY_FIELD_FROM_BLOCK = 0;
  public static SOLIDITY_FIELD_VOTES = 1;

  /**
   * Converts a `Checkpoint` model entity from an array representation (
   * usually returned by a solidity contract function) to a Plain Old Java Object.
   *
   * @param arr The array containing the values of properties describing a
   * `Checkpoint` model entity.
   */
  public static ofSolidityStruct(arr: unknown[]): Checkpoint {
    return {
      fromBlock: arr[CheckpointConverter.SOLIDITY_FIELD_FROM_BLOCK] as number,
      votes: arr[CheckpointConverter.SOLIDITY_FIELD_VOTES] as string,
    };
  }

  public static ofSolidityStructList(arrayOfArrays: unknown[][]): Checkpoint[] {
    return arrayOfArrays.map(CheckpointConverter.ofSolidityStruct);
  }
}
