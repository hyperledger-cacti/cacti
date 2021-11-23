import { IEthContractDeployment } from "./i-eth-contract-deployment";
import { IFabricContractDeployment } from "./i-fabric-contract-deployment";

export interface ICarbonAccountingXdaiContractDeploymentInfo {
  daoToken: IEthContractDeployment;
  governor: IEthContractDeployment;
  timelock: IEthContractDeployment;
  netEmissionsTokenNetwork: IEthContractDeployment;
}

export interface ICarbonAccountingFabricContractDeploymentInfo {
  emissions: IFabricContractDeployment;
}
