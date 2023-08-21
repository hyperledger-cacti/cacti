import { BambooHarvest } from "@hyperledger/cactus-example-supply-chain-business-logic-plugin";

export function isBambooHarvest(x: unknown): x is BambooHarvest {
  return (
    !!x &&
    typeof (x as BambooHarvest).id === "string" &&
    typeof (x as BambooHarvest).location === "string" &&
    typeof (x as BambooHarvest).startedAt === "string" &&
    typeof (x as BambooHarvest).endedAt === "string" &&
    typeof (x as BambooHarvest).harvester === "string"
  );
}
