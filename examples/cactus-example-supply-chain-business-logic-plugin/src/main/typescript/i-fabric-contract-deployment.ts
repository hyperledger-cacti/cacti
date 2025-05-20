export interface IFabricContractDeployment {
  chaincodeId: string;
  channelName: string;
  keychainId: string;
  manufacturerDataChaincodeId?: string;
  bambooHarvestChaincodeId?: string;
  bookshelfChaincodeId?: string;
}
