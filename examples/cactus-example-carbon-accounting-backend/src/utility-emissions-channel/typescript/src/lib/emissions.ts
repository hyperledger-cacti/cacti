/*
    SPDX-License-Identifier: Apache-2.0
*/

/* tslint:disable:max-classes-per-file */

import { ChaincodeStub } from "fabric-shim";
import { State } from "../util/state";
import { QueryResult, WorldState } from "../util/worldstate";

// EMISSION_CLASS_IDENTIFIER : identifier for emissions record inside HL Fabric
const EMISSION_CLASS_IDENTIFIER =
  "org.hyperledger.blockchain-carbon-accounting.emissionsrecord";

export interface EmissionsRecordInterface {
  class?: string;
  key?: string;
  uuid?: string;
  utilityId?: string;
  partyId?: string;
  fromDate?: string;
  thruDate?: string;
  emissionsAmount?: number;
  renewableEnergyUseAmount?: number;
  nonrenewableEnergyUseAmount?: number;
  energyUseUom?: string;
  factorSource?: string;
  url?: string;
  md5?: string;
  tokenId?: string;
}

/**
 * EmissionsRecord class extends State class
 * Class will be used by application and smart contract to define a paper
 */
export class EmissionsRecord extends State {
  record: EmissionsRecordInterface;
  constructor(_record: EmissionsRecordInterface) {
    super([
      _record.utilityId,
      _record.partyId,
      _record.fromDate,
      _record.thruDate,
    ]);
    this.record = _record;
    this.record.class = EMISSION_CLASS_IDENTIFIER;
    this.record.key = this.getKey();
  }
  toBuffer(): Uint8Array {
    return State.serialize<EmissionsRecordInterface>(this.record);
  }
  fromBuffer(buf: Uint8Array): EmissionsRecord {
    return new EmissionsRecord(
      State.deserialize<EmissionsRecordInterface>(buf),
    );
  }
}

/**
 * EmissionsRecordWorldState class is wrapper around chaincode stub
 * for managing lifecycle of a EmissionRecord
 */
export class EmissionRecordState extends WorldState<EmissionsRecordInterface> {
  constructor(stub: ChaincodeStub) {
    super(stub);
  }
  async addEmissionsRecord(
    record: EmissionsRecord,
    uuid: string,
  ): Promise<void> {
    return await this.addState(uuid, record.record);
  }
  async getEmissionsRecord(uuid: string): Promise<EmissionsRecord> {
    return new EmissionsRecord(await this.getState(uuid));
  }
  async updateEmissionsRecord(
    record: EmissionsRecord,
    uuid: string,
  ): Promise<void> {
    return await this.updateState(uuid, record.record);
  }
  async getAllEmissionRecords(
    utilityId: string,
    partyId: string,
  ): Promise<QueryResult<EmissionsRecordInterface>[]> {
    const queryString = `{"selector": {"class": "${EMISSION_CLASS_IDENTIFIER}","utilityId": "${utilityId}", "partyId": "${partyId}"}}`;
    return await this.query(queryString);
  }
  async getAllEmissionsDataByDateRange(
    fromDate: string,
    thruDate: string,
  ): Promise<QueryResult<EmissionsRecordInterface>[]> {
    const queryString = `{
      "selector": {
        "class": {
           "$eq": "${EMISSION_CLASS_IDENTIFIER}"
        },
        "fromDate": {
          "$gte": "${fromDate}"
        },
        "thruDate": {
          "$lte": "${thruDate}"
        }
      }
    }`;
    return await this.query(queryString);
  }
  async getAllEmissionsDataByDateRangeAndParty(
    fromDate: string,
    thruDate: string,
    partyId: string,
  ): Promise<QueryResult<EmissionsRecordInterface>[]> {
    const queryString = `{
      "selector": {
        "class": {
          "$eq": "${EMISSION_CLASS_IDENTIFIER}"
        },
        "fromDate": {
          "$gte": "${fromDate}"
        },
        "thruDate": {
          "$lte": "${thruDate}"
        },
        "partyId": {
          "$eq": "${partyId}"
        }
      }
    }`;
    return this.query(queryString);
  }
}
