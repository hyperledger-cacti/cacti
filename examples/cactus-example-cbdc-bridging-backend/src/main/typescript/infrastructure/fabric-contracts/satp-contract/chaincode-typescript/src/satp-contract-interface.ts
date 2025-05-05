/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from "fabric-contract-api";

/*
 *  Smart Contract Interface to define the methods needed by SATP Wrapper Contract.
 */

export interface SATPContractInterface {
  // mint creates new tokens with the given amount and assigns them to the owner.
  mint(ctx: Context, amount: string): Promise<boolean>;
  // burn destroys the given amount of tokens from the owner.
  burn(ctx: Context, amount: string): Promise<boolean>;
  // assign assigns the given amount of tokens from the owner to the target, without approval.
  assign(
    ctx: Context,
    from: string,
    to: string,
    amount: string,
  ): Promise<boolean>;
  // transfer transfers the given amount of tokens from the sender to the target, with approval needed.
  transfer(
    ctx: Context,
    from: string,
    to: string,
    amount: string,
  ): Promise<boolean>;
  // hasPermission checks if the clientMSPID has the permission to perform actions.
  hasPermission(ctx: Context, clientMSPID: string): Promise<boolean>;
}
