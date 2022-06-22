export class LedgerBase {
    ledgerId: string;                   // Unique ID of a ledger in which the Weaver interoperation module is installed
    contractId: string;                 // Unique ID of the contract corresponding to the Weaver interoperation module installed in 'ledgerId'
    private _isConnected: boolean       // Flag indicating whether we are ready to invoke contracts on the ledger

    constructor(ledgerId: string, contractId: string) {
        this.ledgerId = ledgerId;
        this.contractId = contractId;
        this._isConnected = false;
    }

    getLedgerID(): string {
        return this.ledgerId;
    }

    getContractID(): string {
        return this.contractId;
    }

    isConnected(): boolean {
        return this._isConnected;
    }

    // Setup a user (with wallet and one or more identities) with contract invocation credentials
    async setupWalletIdentity() {
    }

    // Preliminary configuration as a prerequisite for contract invocation
    async setupLedgerConnection() {
        this._isConnected = true;
    }

    // Invoke a contract to drive a transaction
    // TODO: Add parameters corresponding to the output of a flow among IIN agents
    async invokeContract() {
    }

    // Query a contract to fetch information from the ledger
    async queryContract() {
    }
}
