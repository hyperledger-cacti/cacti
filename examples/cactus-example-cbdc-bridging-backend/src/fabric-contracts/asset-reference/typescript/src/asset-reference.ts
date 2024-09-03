/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class AssetReference {
  @Property()
  public id: string;

  @Property()
  public isLocked: boolean;

  @Property()
  public numberTokens: number;

  @Property()
  public recipient: string;
}
