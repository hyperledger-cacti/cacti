import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";

export interface ICreateJvmStringOptions {
  readonly data: Readonly<string>;
}

export function createJvmString(
  opts: Readonly<ICreateJvmStringOptions>,
): JvmObject {
  if (!opts) {
    throw new Error("Expected arg1 to be truthy");
  }
  if (!opts.data) {
    throw new Error("Expected arg1.data to be truthy");
  }
  if (typeof opts.data !== "string") {
    throw new Error("Expected arg1.data to be string");
  }

  return {
    jvmTypeKind: JvmTypeKind.Primitive,
    jvmType: {
      fqClassName: "java.lang.String",
    },
    primitiveValue: opts.data,
  };
}
