import { IEthContractDeployment } from "./i-eth-contract-deployment.js";
import { IFabricContractDeployment } from "./i-fabric-contract-deployment.js";

export interface ICarbonAccountingXdaiContractDeploymentInfo {
  daoToken: IEthContractDeployment;
  governor: IEthContractDeployment;
  timelock: IEthContractDeployment;
  netEmissionsTokenNetwork: IEthContractDeployment;
}

export interface ICarbonAccountingFabricContractDeploymentInfo {
  emissions: IFabricContractDeployment;
}
