/*
    SPDX-License-Identifier: Apache-2.0
*/

import { ChaincodeStub } from "fabric-shim";
import { State } from "../util/state";
import { QueryResult, WorldState } from "../util/worldstate";

/* tslint:disable:max-classes-per-file */

const UTILITY_LOOKUP_ITEM_CLASS_IDENTIFIER =
  "org.hyperledger.blockchain-carbon-accounting.utilitylookuplist";

export interface DivisionsInterface {
  division_type: string;
  division_id: string;
}
export interface UtilityLookupItemInterface {
  class?: string;
  key?: string;
  uuid: string;
  year?: string;
  utility_number?: string;
  utility_name?: string;
  country?: string;
  state_province?: string;
  divisions?: DivisionsInterface;
}

export class UtilityLookupItem extends State {
  item: UtilityLookupItemInterface;
  constructor(_item: UtilityLookupItemInterface) {
    super([_item.uuid]);
    this.item = _item;
    this.item.class = UTILITY_LOOKUP_ITEM_CLASS_IDENTIFIER;
    this.item.key = this.getKey();
  }
  toBuffer(): Uint8Array {
    return State.serialize<UtilityLookupItemInterface>(this.item);
  }
  fromBuffer(buf: Uint8Array): UtilityLookupItem {
    return new UtilityLookupItem(
      State.deserialize<UtilityLookupItemInterface>(buf),
    );
  }
}

export class UtilityLookupItemState extends WorldState<
  UtilityLookupItemInterface
> {
  constructor(stub: ChaincodeStub) {
    super(stub);
  }
  async addUtilityLookupItem(
    item: UtilityLookupItem,
    uuid: string,
  ): Promise<void> {
    return await this.addState(uuid, item.item);
  }

  async getUtilityLookupItem(uuid: string): Promise<UtilityLookupItem> {
    return new UtilityLookupItem(await this.getState(uuid));
  }

  async getAllUtilityLookupItems(): Promise<
    QueryResult<UtilityLookupItemInterface>[]
  > {
    const queryString = `{"selector": {"class": "${UTILITY_LOOKUP_ITEM_CLASS_IDENTIFIER}"}}`;
    return await this.query(queryString);
  }
  async updateUtilityLookupItem(
    item: UtilityLookupItem,
    uuid: string,
  ): Promise<void> {
    return await this.updateState(uuid, item.item);
  }
}
