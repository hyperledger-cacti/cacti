export default class Helpers {
    private web3: any;
    private contracts: { [key: string]: any; } = {};
    constructor(web3: any, contracts: { [key: string]: any; }) {
        this.web3 = web3;
        this.contracts = contracts;
    }

    addContractInstanceToMap(name: string, contractInstance: any) {
        this.contracts.set(name, contractInstance);
    }

    toBytes32(param: string) {
        return this.web3.utils.utf8ToHex(param);
    }

    hexToNumberString(hex: number) {
        return this.web3.utils.hexToNumberString(hex);
    }

    // converts an int to uint256
    numberToUint256(value: number) {
        const hex = value.toString(16)
        return `0x${'0'.repeat(64 - hex.length)}${hex}`
    }

    // encodes parameter to pass as contract argument
    encodeParameters(dataType: any, data: any) {
        return this.web3.eth.abi.encodeParameters(dataType, data)
    }

    // returns true if contract is deployed on-chain
    async isContract(address: string) {
        const code = await this.web3.eth.getCode(address)
        return code.slice(2).length > 0
    }

    async getNonce(accountAddress: string) {
        return await this.web3.eth.getTransactionCount(accountAddress, "pending");
    }

    async sendSignedTransactionPromise(signedTx: string, TxHashCallback: any) {
        return this.web3.eth.sendSignedTransaction(signedTx).once('transactionHash', function (hash: string) {
            TxHashCallback(hash);
        });
    }
}