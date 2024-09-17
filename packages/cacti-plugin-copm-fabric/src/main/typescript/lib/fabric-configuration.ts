import { Wallet } from "fabric-network";
import { FabricContractContext } from "./fabric-types";
import { TransferrableAsset } from "@hyperledger-cacti/cacti-copm-core";

export interface FabricConfiguration {
  getAssetContractName(asset: TransferrableAsset): string;
  getConnectionProfile(orgKey: string): object;
  getContractContext(orgKey: string): Promise<FabricContractContext>;
  getOrgWallet(orgKey: string): Promise<Wallet>;
}
