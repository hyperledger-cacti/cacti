import { Asset } from "./asset";

export interface BesuAsset extends Asset {
  contractName: string;
  contractAddress: string;
}
