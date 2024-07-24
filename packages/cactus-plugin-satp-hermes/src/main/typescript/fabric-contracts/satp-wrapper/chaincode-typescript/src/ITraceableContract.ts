/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from "fabric-contract-api";

export interface ITraceableContract {
  // GetAllAssetsKey returns all assets key found in the world state.
  GetAllAssetsKey(ctx: Context): Promise<string>;

  // GetAllTxByKey returns all transations for a specific key.
  GetAllTxByKey(ctx: Context, key: string): Promise<string>;
}
