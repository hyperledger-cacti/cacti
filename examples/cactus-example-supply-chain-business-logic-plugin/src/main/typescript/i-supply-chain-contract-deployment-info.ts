import { IEthContractDeployment } from "./i-eth-contract-deployment.js";
import { IFabricContractDeployment } from "./i-fabric-contract-deployment.js";

export interface ISupplyChainContractDeploymentInfo {
  bambooHarvestRepository: IEthContractDeployment;
  bookshelfRepository: IEthContractDeployment;
  shipmentRepository: IFabricContractDeployment;
}
