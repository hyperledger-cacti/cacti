import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";

export function createJvmLong(data: number): JvmObject {
  return {
    jvmTypeKind: JvmTypeKind.Primitive,
    jvmType: {
      fqClassName: "long",
    },
    primitiveValue: data,
  };
}
