/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export class LedgerBase {
    ledgerId: string;                   // Unique ID of a ledger in which the Weaver interoperation module is installed
    contractId: string;                 // Unique ID of the contract corresponding to the Weaver interoperation module installed in 'ledgerId'

    constructor(ledgerId: string, contractId: string) {
        this.ledgerId = ledgerId;
        this.contractId = contractId;
    }

    getLedgerID(): string {
        return this.ledgerId;
    }

    getContractID(): string {
        return this.contractId;
    }

    // Setup a user (with wallet and one or more identities) with contract invocation credentials
    async setupWalletIdentity() {
    }

    // Invoke a contract to drive a transaction
    // TODO: Add parameters corresponding to the output of a flow among IIN agents
    async invokeContract() {
    }

    // Query a contract to fetch information from the ledger
    async queryContract() {
    }
}
