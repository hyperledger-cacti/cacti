# EVM Nonce Manager Github Issue investigation (#1036)
Report stating the work and investigation done in this regard for the [issue](https://github.com/hyperledger/cactus/issues/1036)/


### Issue Description
Architecture, design and development of a higly available setup that does not have nonce related issues with a round robin load balancer fronting a cluster of API servers running EVM connectors so that one could actually be able to run the ledger at peak performance via Cactus.


### Solutions explored/investigated
The various solutions explored/investigated so far are as follows:

##### **nonce-tracker**
**DESCRIPTION**: Maintains global and local nonces and continously polls the global nonces
**ISSUE**: Works with web3 v1.0 references (the provider calls like provider.prototype.sendAsync, getPendingTransactions method etc.)
**CONCLUSION**: nonce-tracker package dropped because of compatibility reasons and workarounds which will make certain calls synchronous (like, to fix the sendAsync call, the following workaround works but makes call synchronous in nature: 
`web3.providers.HttpProvider.prototype.sendAsync = web3.providers.HttpProvider.prototype.send`)
**SOLUTION ACCEPTED**: FALSE

##### **mutex/binary-semaphores**
**DESCRIPTION**: Locks the code execution from nonce allocation till sending of signed transaction.
**ISSUE**: The lock information is stored in program heap, which isnt globally available (in case someone tries to run a connector from another machine or another code instance, mutex locks will not work.
**CONCLUSION**: To look for other resources with same functionality and global state storing mechanism.
**SOLUTION ACCEPTED**: FALSE

##### **kafka**
**DESCRIPTION**: Message Queue system which can be used to issue nonces to the tx messages
**ISSUE**:
1. If we pass the transactionRequest to the message queue, then   
	   a. We cannot lock the flow from nonce issuance till sending transactions. 
	b. As kafka based solution will be a global state store, even if we can set locks from nonce allowance till sending transactions, we cannot guarantee consistency in nonce allowance as these locks cannot control execution of connectors located on other machine.
2. If we pass signedTransactions to the message queue, editing the signed transactions to change nonces isnt a good idea, given this kafka cluster will be globally available.  

**CONCLUSION**: Can be explored for local nonce-management, but not for global nonces.
**SOLUTION ACCEPTED**: FALSE

##### red-lock
**DESCRIPTION**: Locks a certain piece of code via global locks which are highly available and fault tolerant
**ISSUE**: The transactions-per-second is very low, because of the presence of a global lock for each account address
**CONCLUSION**: The use of same account on various machines is an example of "wrong use of software" and can be labelled as such.
**SOLUTION ACCEPTED**: FALSE