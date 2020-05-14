import { Container } from "dockerode";

export interface ITestLedger {
  start(): Promise<Container>;
  stop(): Promise<any>;
  destroy(): Promise<any>;
}
