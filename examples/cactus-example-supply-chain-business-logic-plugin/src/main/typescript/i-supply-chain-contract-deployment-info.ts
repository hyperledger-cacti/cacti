import { IEthContractDeployment } from "./i-eth-contract-deployment";

export interface ISupplyChainContractDeploymentInfo {
  bambooHarvestRepository: IEthContractDeployment;
  bookshelfRepository: IEthContractDeployment;
}
