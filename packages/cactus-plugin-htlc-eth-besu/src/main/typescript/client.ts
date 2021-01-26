import fs from 'fs';
import path from 'path';
import Web3 from 'web3';
import request from 'request';
import { environment } from './environment'
import { Transaction } from 'ethereumjs-tx';
import Helpers from './helpers'
export default class Client {
    private web3: any;
    public Helpers: Helpers;
    private contracts: { [key: string]: any; } = {};

    constructor() {
        const node = environment.NODE!;
        console.log(`Creating new blockchain connection to`, node);
        this.web3 = new Web3(new Web3.providers.HttpProvider(node));

        console.log(`Loading contracts`);
        this.loadContracts(environment.CONTRACT_PATH!);

        this.Helpers = new Helpers(this.web3, this.contracts);
    }

    /**
    * Reads a value from the blockchain
    * @param functionName contract function name
    * @param paramsArray  parameters of the function
    * @param contractName string with contract name or contract instance
    * @param contractAddress  (optional) contract address
    * @return object
    */
    async sendCall(functionName: string, paramsArray: any, contractName: string, contractAddress?: string) {
        try {
            if (contractName) {
                var contract;
                if (contractName && typeof contractName === 'string') {
                    contract = this.contracts[contractName];
                    // If there is no such contract
                    if (typeof contract === 'undefined') {
                        console.log('Contract name not recognized');
                        throw new Error('Contract name not recognized');
                    }
                    if (typeof contractAddress !== 'string') {
                        contractAddress = contract._address;
                    }
                    contract.options.address = contractAddress;
                }
                else
                    contract = contractName;
                const contractCode = await this.web3.eth.getCode(contractAddress);
                if (contractCode === '0x')
                    throw new Error('There is no contract with the specified address');
                console.log(`Call ${functionName} sent to contract ${contractName} @ ${contractAddress}`);
                return await contract.methods[functionName](...paramsArray).call({
                    from: environment.ACCOUNT_ADDRESS
                }).catch((revertReason: any) => console.log({ revertReason }));
            }
            console.log('sendCall() needs a the name of the contract');
            throw new Error('sendCall() needs a the name of the contract');
        } catch (err) {
            throw err;

        }
    }

    /**
    * Loads all the contracts specified in the configuration contractsPath
    * @param contractsPath Paths with the compiled smart contracts
    * @return Map with the loaded contract instances
    */
    private async loadContracts(contractsPath: string) {
        const networkId = await this.web3.eth.net.getId();
        fs.readdirSync(contractsPath).forEach(contractName => {
            console.log("Contracts names: ")
            console.log(contractName)
            const filePath = path.join(contractsPath, contractName);
            try {
                var parsedContract = JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
                if (parsedContract.networks[networkId] == undefined) {
                    console.log(`Contract ${contractName} not deployed on network ${networkId}`);
                }
                var contractInfo: any = {
                    name: contractName,
                    abi: parsedContract.abi,
                    bytecode: parsedContract.bytecode,
                    address: parsedContract.networks[networkId].address
                };
                let contractInstance = new this.web3.eth.Contract(contractInfo.abi, contractInfo.address);
                contractInstance.bytecode = contractInfo.bytecode;
                this.contracts[contractInfo.name] = contractInstance;
                console.log(`Contract ${contractInfo.name} loaded`);
            } catch (error) {
                console.log(error.message);
                /* istanbul ignore else */ // Depends on ganache only
                if (error.message.substring('networkID is not defined')) {
                    console.log('Node did not respond to query, maybe is down or unaccessible');
                } else {
                    console.log('Couldn load contract ' + filePath + ' as specified in config.js file');
                }
            }
        });
    }
}