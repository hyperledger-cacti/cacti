export interface Asset {
  tokenId: string;
  tokenType: TokenType;
  owner: string;
  amount: number;
}

export enum TokenType {
  ERC20 = "ERC20",
}
