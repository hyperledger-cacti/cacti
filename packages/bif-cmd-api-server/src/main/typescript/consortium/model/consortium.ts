import { BifNode } from "./bif-node";

export interface IConsortium {
  id: string;
  name: string;
  configurationEndpoint: string;
  bifNodes: BifNode[];
}
