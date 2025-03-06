import { IBridgeLeafOptions } from "../bridge-leaf";

export abstract class BridgeManagerAdminInterface {
  public abstract deployLeaf(leafOptions: IBridgeLeafOptions): Promise<void>;
}
