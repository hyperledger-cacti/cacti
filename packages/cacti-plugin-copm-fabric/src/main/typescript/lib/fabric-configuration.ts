import { Wallet } from "fabric-network";
import { FabricContractContext } from "./fabric-types";

export interface FabricConfiguration {
  getConnectionProfile(orgKey: string): object;
  getContractContext(orgKey: string): Promise<FabricContractContext>;
  getOrgWallet(orgKey: string): Promise<Wallet>;
}
