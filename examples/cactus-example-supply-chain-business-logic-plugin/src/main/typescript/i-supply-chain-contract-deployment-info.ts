import { IEthContractDeployment } from "./i-eth-contract-deployment";
import { IFabricContractDeployment } from "./i-fabric-contract-deployment";

export interface ISupplyChainContractDeploymentInfo {
  shipmentRepository: IFabricContractDeployment;
  roleManager?: IEthContractDeployment;
  payment?: IEthContractDeployment;
}
