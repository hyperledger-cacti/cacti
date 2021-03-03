# `@hyperledger/cactus-plugin-ledger-connector-polkadot`


The Polkadot Connector provides functionality that enables any permissioned blockchain (as long as it is supported by Hyperledger Cactus) to connect to the Polkadot network and perform monetary trans- actions to the latter. Besides this, the connector provides methods for these blockchains to deploy and interact with smart contracts in the network.

Our connector in Hyperledger Cactus uses three different API’s to communicate with the Polkadot network: ”@polkadot/api” (which has the base API functionality), ”@polkadot/api-contracts” (which con- tains the API specific for smart contract interaction) and ”@polkadot/types” (which encompasses specific
Polkadot types).

### Interfaces
Prior to diving into the main functions, we present the interfaces that are either fed as input (requests)
or returned as output (responses) in those functions:

#### DeployContractInkBytecodeRequest

A request that encompasses the attributes required to de- ploy a specific ink! smart contract in Polkadot. These are:
– wasm-AUint8Arrayobject(atypedarrayof8-bitunsignedintegervalues)whichcorresponds to a WASM binary file, generated after building the smart contract code;
– abi - An AnyJson object (can be a string, number, boolean or any type of json object) cor- responding to the smart contract’s Application Binary Interface (ABI), which describes the interfaces that can be used to interact with the contract;
– endowment - A positive number which corresponds to the balance to transfer to the newly created smart contract;
– gasLimit - A positive number which corresponds to the maximum gas the caller is willing to spend when executing the smart contract’s constructor;
– params - An optional parameter of type Array <Unknown>, corresponding to any parameters that possibly need to be supplied to the smart contract’s constructor

#### DeployContractInkBytecodeResponse
 A response returned by the connector which provides in- formation on the success of the smart contract’s deployment. It contains only one attribute, suc- cess, a boolean value with the value ”true” in case the smart contract was deployed, and ”false” otherwise.

 #### ReadStorageRequest
A request that contains attributes necessary for reading the storage of a smart contract. The latter are:
– account - A string that corresponds to the Polkadot account which wants to perform the read request. This account signs the transaction encoding the read operation;
– gasLimit - A positive number which corresponds to the maximum gas the caller is willing to spend when executing the smart contract’s constructor;
– read function - A string corresponding to the name of the read function for the specific smart contract;
– params - An optional Array <Unknown>, corresponding to any parameters that possibly need to be supplied to the smart contract’s read function.

#### ReadStorageResponse
A response returned by the connector which provides information on the success of the read operation. It encompasses the following attributes:
– success - A boolean with the value ”true” in case the smart contract was deployed, and ”false” otherwise;
– output - An optional parameter of type AnyJson, which corresponds to the output of the read operation (only existing in case the operation was successful).

#### WriteStorageRequest
A request that contains attributes necessary for writing in the storage of a smart contract. These are similar to the attributes in a ReadStorageRequest:
– account - A string that corresponds to the Polkadot account which wants to perform the write request. This account signs the transaction encoding the read operation;
– gasLimit - A positive number which corresponds to the maximum gas the caller is willing to spend when executing the smart contract’s constructor;
– write function - A string corresponding to the name of the write function for the specific smart contract;
– params - An optional Array <Unknown>, corresponding to any parameters that possibly need to be supplied to the smart contract’s write function.

#### WriteStorageResponse
 A response returned by the connector which provides information on the success of the write operation. It contains only one attribute, success, a boolean value with the value ”true” in case the smart contract was deployed, and ”false” otherwise.

 ### Methods

Leveraging the aforementioned interfaces, we present the most relevant connector functions for our work:

#### deployContract
A function that receives a DeployContractInkBytecodeRequest, returns a De- ployContractInkBytecodeResponse and whose purpose is to deploy a smart contract given the above-mentioned parameters. The function throws an error in case the smart contract deployment fails. Otherwise, it stores the contract’s ABI and code and sets success = true.


#### readStorage
A function that receives a ReadStorageRequest, returns a ReadStorageResponse and whose purpose is to perform a read operation on a smart contract given the attributes of the request. The function throws an error in case the operation fails or, in case the result is a falsy value, returns success with the value ”false”. Otherwise, it returns the attribute success with the value ”true”, along with the retrieved output of the read function.

#### writeStorage
A function that receives a WriteStorageRequest, returns a WriteStorageResponse and whose purpose is to perform a write operation on a smart contract given the attributes of the request. The function throws an error in case the operation fails or, in case the result is a falsy value, returns success with the value ”false”. Otherwise, it returns the attribute success with the value ”true”.

Besides these functions, as presented before, the connector presents functionality to send monetary transactions to Polkadot. It also leverages a metrics collection and alerting tool, Prometheus that stores the number of transaction performed.


## Future Work
-Export endpoints, interfaces, and types to OpenAPI
-Complete and enable most connector endpoints
-Dockerize connector