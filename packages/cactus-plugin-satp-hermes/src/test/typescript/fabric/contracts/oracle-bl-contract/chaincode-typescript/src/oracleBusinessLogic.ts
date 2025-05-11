/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Context,
  Contract,
  Info,
  Transaction,
} from "fabric-contract-api";
import { Data } from "./data";

@Info({
  title: "OracleBLContract",
  description: "Smart contract for storing data",
})
export class OracleBLContract extends Contract {
  @Transaction()
  public async InitLedger(ctx: Context): Promise<void> {
    const records: Data[] = [
      {
        ID: "id1",
        payload: "payload1",
      },
      {
        ID: "id2",
        payload: "payload2",
      },
    ];

    for (const data of records) {
      await ctx.stub.putState(data.ID, Buffer.from(JSON.stringify(data)));
      await ctx.stub.putState("nonce", Buffer.from("0"));
      console.info(`Data with id ${data.ID} initialized`);
    }
  }

  // WriteData writes data to the world state with given details.
  @Transaction()
  public async WriteData(
    ctx: Context,
    id: string,
    payload: string,
  ): Promise<void> {
    const data: Data = {
      ID: id,
      payload: payload,
    };

    const nonce = await ctx.stub.getState("nonce");
    if (!nonce || nonce.length === 0) {
      throw new Error(`Nonce not found`);
    }
    const nonceValue = parseInt(nonce.toString());

    await ctx.stub.putState(id, Buffer.from(JSON.stringify(data)));
    await ctx.stub.putState("nonce", Buffer.from((nonceValue + 1).toString()));
    await ctx.stub.setEvent(
      "UpdatedData",
      Buffer.from(JSON.stringify({ id: id, payload: payload })),
    );
  }

  // ReadData returns the data stored in the world state with given id.
  @Transaction(false)
  public async ReadData(ctx: Context, id: string): Promise<string> {
    const dataJSON = await ctx.stub.getState(id); // get the data from chaincode state
    if (!dataJSON || dataJSON.length === 0) {
      throw new Error(`Data with ${id} does not exist`);
    }
    return dataJSON.toString();
  }

  // ReadNonce returns the nonce stored in the world state.
  @Transaction(false)
  public async ReadNonce(ctx: Context): Promise<string> {
    const nonce = await ctx.stub.getState("nonce");
    if (!nonce || nonce.length === 0) {
      throw new Error(`Nonce not found`);
    }
    return nonce.toString();
  }
}
