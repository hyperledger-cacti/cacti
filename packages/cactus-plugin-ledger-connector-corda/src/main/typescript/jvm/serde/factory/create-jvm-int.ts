import { JvmObject } from "../../../generated/openapi/typescript-axios/api";
import { JvmTypeKind } from "../../../generated/openapi/typescript-axios/api";

export function createJvmInt(data: number): JvmObject {
  return {
    jvmTypeKind: JvmTypeKind.Primitive,
    jvmType: {
      fqClassName: "java.lang.Integer",
    },
    primitiveValue: data,
  };
}
