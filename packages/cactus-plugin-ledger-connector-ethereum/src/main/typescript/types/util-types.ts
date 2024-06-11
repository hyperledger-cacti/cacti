import { Bytes, FMT_BYTES, FMT_NUMBER, Numbers } from "web3";

const WEB3_RECEIPT_SUCCESS_CODE = "1";

/**
 * Convert `Numbers` and `Bytes` occurrences to string.
 * Use with web3js response types where custom (string) return format was applied but
 * didn't affect the response type.
 *
 * @warn Ensure that web3 method really returns string encoded numbers and bytes before using this!
 */
export type ConvertWeb3ReturnToString<T> = {
  [K in keyof T]: T[K] extends Numbers | Bytes | undefined ? string : T[K];
};

/**
 * Convert status code to boolean value.
 *
 * @param status transaction receipt status
 * @returns boolean or undefined if status not defined
 */
export function convertWeb3ReceiptStatusToBool(
  status?: Numbers,
): boolean | undefined {
  if (status) {
    return status.toString() === WEB3_RECEIPT_SUCCESS_CODE;
  }

  return undefined;
}

/**
 * Custom web3 return format that will convert numbers and bytes to string.
 *
 * @warn doesn't work everywhere, sometimes you must copy-paste it directly to satisfy web3 generics.
 */
export const Web3StringReturnFormat = {
  number: FMT_NUMBER.STR,
  bytes: FMT_BYTES.HEX,
};
