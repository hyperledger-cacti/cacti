/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Token {
  @Property()
  tokenType: string;

  @Property()
  tokenId: string;

  @Property()
  referenceId: string;

  @Property()
  owner: string;

  @Property()
  mspId: string;

  @Property()
  channelName: string;

  @Property()
  contractName: string;

  @Property()
  amount: number;
}
