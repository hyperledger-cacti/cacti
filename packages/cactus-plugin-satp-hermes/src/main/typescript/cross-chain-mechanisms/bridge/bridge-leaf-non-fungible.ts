/**
 * Abstract class representing a non-fungible bridge leaf.
 * This class provides the structure for deploying and retrieving
 * the receipt of a non-fungible wrapper contract.
 */
export abstract class BridgeLeafNonFungible {
  /**
   * Deploys the non-fungible wrapper contract.
   * This method should be implemented to handle the deployment logic.
   */
  public abstract deployNonFungibleWrapperContract(): Promise<void>;

  /**
   * Retrieves the receipt of the deployed non-fungible wrapper contract.
   * This method should be implemented to return the deployment receipt.
   *
   * @returns {unknown} The receipt of the deployed non-fungible wrapper contract.
   */
  public abstract getDeployNonFungibleWrapperContractReceipt(): unknown;

  //TODO: Implement this NON-FUNGIBLE bridge
}
