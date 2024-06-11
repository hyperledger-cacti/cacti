export interface Block {
  blockHash: string;
  blockCreator: string;
  blockSigners: string[];
}

export class StateProof {
  private stateID: string;
  private value: string;
  private blocks: Block[];
  private version: number;

  constructor(value: string, version: number, stateID: string) {
    this.blocks = [];
    this.value = value;
    this.version = version;
    this.stateID = stateID;
  }

  public getValue() {
    return this.value;
  }
  public getVersion() {
    return this.version;
  }
  public getStateID() {
    return this.stateID;
  }
  public addBlock(block: Block) {
    this.blocks.push(block);
  }
}
