package org.hyperledger.cacti.plugin.copm.corda

/***
  Encapsulates a parameter from the corda library that requires a corda node 
  connection to resolve. 
  
  Parameter values are resolved when a corda transaction is invoked.

  see: CordaParty

 ***/
interface CordaType {
    fun toCordaParam(rpc: NodeRPCConnection) : Any
}