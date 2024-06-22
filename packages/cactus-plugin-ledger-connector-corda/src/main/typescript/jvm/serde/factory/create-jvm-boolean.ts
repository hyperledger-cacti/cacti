import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";

export function createJvmBoolean(data: boolean): JvmObject {
  return {
    jvmTypeKind: JvmTypeKind.Primitive,
    jvmType: {
      fqClassName: "boolean",
    },
    primitiveValue: data,
  };
}
