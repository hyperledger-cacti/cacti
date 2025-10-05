/**
 * @fileoverview SATP Utility Functions - Enum conversion helpers
 *
 * This module provides utility functions for working with TypeScript enumerations
 * in the SATP protocol implementation. These utilities enable bidirectional
 * conversion between enum keys and values, facilitating serialization,
 * deserialization, and human-readable representation of protocol enumerations.
 *
 * @module SatpUtils
 * @since 0.0.3-beta
 */

/**
 * Retrieves the enum key (name) corresponding to a numeric enum value.
 *
 * @description
 * Performs reverse lookup on TypeScript enumerations to find the key (string name)
 * associated with a given numeric value. Useful for converting protocol message
 * enum values to human-readable strings for logging and debugging.
 *
 * @template T - The enum object type
 * @param enumObj - The TypeScript enum object to search
 * @param value - The numeric enum value to look up
 * @returns The enum key as a string, or undefined if not found
 *
 * @example
 * ```typescript
 * enum MessageType { REQUEST = 1, RESPONSE = 2 }
 * const key = getEnumKeyByValue(MessageType, 1);
 * console.log(key); // "REQUEST"
 * ```
 *
 * @since 0.0.3-beta
 */
export function getEnumKeyByValue<T extends object>(
  enumObj: T,
  value: number,
): string | undefined {
  return Object.keys(enumObj).find((key) => enumObj[key as keyof T] === value);
}

/**
 * Retrieves the enum value corresponding to an enum key (name).
 *
 * @description
 * Performs forward lookup on TypeScript enumerations to find the numeric value
 * associated with a given key (string name). Useful for parsing protocol messages
 * and converting string representations to enum values.
 *
 * @template T - The enum object type
 * @param enumObj - The TypeScript enum object to search
 * @param key - The enum key (string name) to look up
 * @returns The numeric enum value, or undefined if not found
 *
 * @example
 * ```typescript
 * enum MessageType { REQUEST = 1, RESPONSE = 2 }
 * const value = getEnumValueByKey(MessageType, "REQUEST");
 * console.log(value); // 1
 * ```
 *
 * @since 0.0.3-beta
 */
export function getEnumValueByKey<T extends object>(
  enumObj: T,
  key: string,
): number | undefined {
  return enumObj[key as keyof T] as unknown as number;
}
