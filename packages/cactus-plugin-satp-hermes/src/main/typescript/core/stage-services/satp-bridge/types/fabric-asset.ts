import { Asset } from "./asset";

export interface FabricAsset extends Asset {
  mspId: string;
  contractName: string;
  channelName: string;
}
