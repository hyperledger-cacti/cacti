import { BusinessLogicPlugin } from "../../../packages/cactus-cmd-socketio-server/src/main/typescript/business-logic-plugin/BusinessLogicPlugin";
import { BusinessLogicCheckEthereumValidator } from "../BusinessLogicCheckEthereumValidator";

export function getTargetBLPInstance(
  businessLogicID: string,
): BusinessLogicPlugin | null {
  switch (businessLogicID) {
    case "jLn76rgB":
      return new BusinessLogicCheckEthereumValidator(businessLogicID);
    default:
      return null;
  }
}
