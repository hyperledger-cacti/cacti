/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Token {
  @Property()
  public tokenType: string;

  @Property()
  public tokenId: string;

  @Property()
  public owner: string;

  @Property()
  public mspId: string;

  @Property()
  channelName: string;

  @Property()
  contractName: string;

  @Property()
  amount: number;
}
