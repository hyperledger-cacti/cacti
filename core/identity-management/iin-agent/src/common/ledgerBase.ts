/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import iin_agent_pb from '@hyperledger-labs/weaver-protos-js/identity/agent_pb';

export class LedgerBase {
    ledgerId: string;                   // Unique ID of a ledger in which the Weaver interoperation module is installed
    memberId: string;                   // Unique ID of Member to which this IIN Agent belongs
    contractId: string;                 // Unique ID of the contract corresponding to the Weaver interoperation module installed in 'ledgerId'

    constructor(ledgerId: string, memberId: string, contractId: string) {
        this.ledgerId = ledgerId;
        this.memberId = memberId;
        this.contractId = contractId;
    }
    
    /* To initialise ledgerBase 
     * E.g. for Fabric: Setup a user (with wallet and one or more identities) with contract invocation credentials
     */
    async init() {
    }

    getLedgerID(): string {
        return this.ledgerId;
    }
    
    getMemberID(): string {
        return this.memberId;
    }

    getContractID(): string {
        return this.contractId;
    }

    // Collect security domain membership info
    async getAttestedMembership(securityDomain: string, nonce: string): Promise<iin_agent_pb.AttestedMembership> {
        return new iin_agent_pb.AttestedMembership();
    }
    
    // Collect security domain membership info
    async counterAttestMembership(attestedMembershipSetSerialized64: string, securityDomain: string, nonce: string): Promise<iin_agent_pb.CounterAttestedMembership> {
        return new iin_agent_pb.CounterAttestedMembership();
    }
    
    // record Membership
    async recordMembershipInLedger(counterAttestedMembership: iin_agent_pb.CounterAttestedMembership): Promise<any> {
        return "";
    }

    // Invoke a contract to drive a transaction
    // TODO: Add parameters corresponding to the output of a flow among IIN agents
    async invokeContract() {
    }

    // Query a contract to fetch information from the ledger
    async queryContract(): Promise<string> {
        return "";
    }
}
