import { CopmTester } from "../interfaces/copm-tester";
import { CopmTesterFabric } from "../fabric/copm-tester-fabric";
import { CopmNetworkMode } from "../lib/types";
import { Logger } from "@hyperledger/cactus-common";
import { CopmTesterCorda } from "../corda/copm-tester-corda";

export function copmTesterFactory(
  log: Logger,
  netType: string,
  networkMode: CopmNetworkMode,
): CopmTester {
  if (netType === "fabric") {
    return new CopmTesterFabric(log, networkMode);
  }
  if (netType == "corda") {
    return new CopmTesterCorda(log, networkMode);
  }
  throw new Error("Unsupported network type: " + netType);
}
