import { Container } from "dockerode";

export interface ITestLedger {
  start(): Promise<Container>;
  stop(): Promise<unknown>;
  destroy(): Promise<unknown>;
}
