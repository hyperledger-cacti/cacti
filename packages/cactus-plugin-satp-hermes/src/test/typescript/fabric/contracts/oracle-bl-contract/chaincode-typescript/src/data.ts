/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Data {
  @Property()
  public ID: string;

  @Property()
  public payload?: string;
}
