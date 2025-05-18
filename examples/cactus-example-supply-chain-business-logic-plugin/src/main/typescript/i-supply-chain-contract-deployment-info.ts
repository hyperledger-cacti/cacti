import { IEthContractDeployment } from "./i-eth-contract-deployment";
import { IFabricContractDeployment } from "./i-fabric-contract-deployment";

export interface ISupplyChainContractDeploymentInfo {
  bambooHarvestRepository: IEthContractDeployment;
  bookshelfRepository: IEthContractDeployment;
  shipmentRepository: IFabricContractDeployment;
}
