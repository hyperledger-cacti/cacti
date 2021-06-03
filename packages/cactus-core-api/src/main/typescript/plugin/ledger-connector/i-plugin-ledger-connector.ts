import { ICactusPlugin } from "../i-cactus-plugin";
import { ConsensusAlgorithmFamily } from "../../generated/openapi/typescript-axios/api";

/**
 * Common interface to be implemented by plugins which are implementing the connection to ledgers.
 */
export interface IPluginLedgerConnector<
  DeployIn,
  DeployOut,
  TransactIn,
  TransactOut
> extends ICactusPlugin {
  /**
   * Deploys a contract written for a ledger that the connector is aimed at
   * supporting.
   */
  deployContract(options?: DeployIn): Promise<DeployOut>;

  /**
   * Executes a transaction on the target ledger of the connector plugin.
   * @param options The options that is specific to the transaction and the
   * type of ledger this connection is targeted at.
   */
  transact(options?: TransactIn): Promise<TransactOut>;

  /**
   * Returns the family of algorithms in which the consensus algorithm used
   * by the ledger (this connector is associated with) belongs in.
   *
   * @see {ConsensusAlgorithmFamily}
   */
  getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily>;
  hasTransactionFinality(): Promise<boolean>;
}
