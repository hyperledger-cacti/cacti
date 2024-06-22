import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";
import { createJvmCurrency } from "./create-jvm-currency";
import { createJvmLong } from "./create-jvm-long";

export interface ICreateJvmCordaAmountOptions {
  readonly currencyCode: Readonly<string>;
  readonly amount: Readonly<number>;
}

export function createJvmCordaAmount(
  opts: Readonly<ICreateJvmCordaAmountOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  if (!opts.amount) {
    throw new Error("Expected arg1.amount to be truthy");
  }
  if (!isFinite(opts.amount)) {
    throw new Error("Expected arg1.amount to be finite");
  }
  if (!opts.currencyCode) {
    throw new Error("Expected arg1.currencyCode to be truthy");
  }
  if (typeof opts.currencyCode !== "string") {
    throw new Error("Expected arg1.currencyCode to be string");
  }
  if (opts.currencyCode.length <= 0) {
    throw new Error("Expected arg1.currencyCode to be non-blank string");
  }
  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName: "net.corda.core.contracts.Amount",
    },

    jvmCtorArgs: [
      createJvmLong(opts.amount),
      createJvmCurrency({ currencyCode: opts.currencyCode }),
    ],
  };
}
