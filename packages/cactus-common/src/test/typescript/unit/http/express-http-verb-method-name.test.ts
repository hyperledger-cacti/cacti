import {
  ALL_EXPRESS_HTTP_VERB_METHOD_NAMES,
  isExpressHttpVerbMethodName,
} from "../../../../main/typescript/public-api";

describe("isExpressHttpVerbMethodName", () => {
  it("should return true for valid HTTP verb method names", () => {
    ALL_EXPRESS_HTTP_VERB_METHOD_NAMES.forEach((methodName) => {
      expect(isExpressHttpVerbMethodName(methodName)).toBe(true);
    });
  });

  it("should return false for invalid values", () => {
    const invalidValues = [
      123, // Not a string
      0, // Falsy Number
      "invalid", // Not a valid HTTP verb method name
      "gEt", // Case-sensitive
      "", // Empty string
      null, // Null value
      undefined, // Undefined value
      {}, // Object
      [], // Array
    ];

    invalidValues.forEach((value) => {
      expect(isExpressHttpVerbMethodName(value)).toBe(false);
    });
  });
});
