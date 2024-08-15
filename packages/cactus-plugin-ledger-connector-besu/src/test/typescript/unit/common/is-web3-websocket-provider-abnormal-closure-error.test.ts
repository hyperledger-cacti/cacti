import "jest-extended";

import { isWeb3WebsocketProviderAbnormalClosureError } from "../../../../main/typescript/common/is-web3-websocket-provider-abnormal-closure-error";
import { WEB3_CONNECTION_NOT_OPEN_ON_SEND } from "../../../../main/typescript/common/is-web3-websocket-provider-abnormal-closure-error";

describe("isWeb3WebsocketProviderAbnormalClosureError", () => {
  it("should return false for non-error values", () => {
    expect(isWeb3WebsocketProviderAbnormalClosureError(null)).toBe(false);
    expect(isWeb3WebsocketProviderAbnormalClosureError(undefined)).toBe(false);
    expect(isWeb3WebsocketProviderAbnormalClosureError(123)).toBe(false);
    expect(isWeb3WebsocketProviderAbnormalClosureError("some string")).toBe(
      false,
    );
    expect(isWeb3WebsocketProviderAbnormalClosureError(Symbol("symbol"))).toBe(
      false,
    );
  });

  it("should return false for error objects without code property", () => {
    const errorWithoutCode = new Error("Some generic error");
    expect(isWeb3WebsocketProviderAbnormalClosureError(errorWithoutCode)).toBe(
      false,
    );
  });

  it("should return false for error objects with incorrect code property", () => {
    const errorWithIncorrectCode: Error = new Error("Some error");

    (errorWithIncorrectCode as unknown as Record<string, unknown>).code =
      "some_other_code";

    expect(
      isWeb3WebsocketProviderAbnormalClosureError(errorWithIncorrectCode),
    ).toBe(false);
  });

  it("it returns true when the correct error message is set", () => {
    const err = new Error(WEB3_CONNECTION_NOT_OPEN_ON_SEND);
    expect(isWeb3WebsocketProviderAbnormalClosureError(err)).toBeTrue();
  });
});
