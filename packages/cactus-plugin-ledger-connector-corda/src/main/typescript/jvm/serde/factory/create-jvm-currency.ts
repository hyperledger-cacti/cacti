import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";

export interface ICreateJvmCurrencyOptions {
  readonly currencyCode: Readonly<string>;
}

export function createJvmCurrency(
  opts: Readonly<ICreateJvmCurrencyOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  if (!opts.currencyCode) {
    throw new Error("Expected arg1.currencyCode to be truthy");
  }
  if (typeof opts.currencyCode !== "string") {
    throw new Error("Expected arg1.currencyCode to be string");
  }

  return {
    jvmTypeKind: JvmTypeKind.Reference,
    jvmType: {
      fqClassName: "java.util.Currency",
      constructorName: "getInstance",
    },
    jvmCtorArgs: [
      {
        jvmTypeKind: JvmTypeKind.Primitive,
        jvmType: {
          fqClassName: "java.lang.String",
        },
        primitiveValue: opts.currencyCode,
      },
    ],
  };
}
