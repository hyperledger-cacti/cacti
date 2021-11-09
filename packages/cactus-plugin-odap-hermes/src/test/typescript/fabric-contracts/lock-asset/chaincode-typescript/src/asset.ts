/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Asset {
  @Property()
  public docType?: string;

  @Property()
  public ID: string;

  @Property()
  public IsLock: boolean;

  @Property()
  public Size: number;
}
