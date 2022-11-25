
# CordappDeploymentConfig

## Properties
Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**sshCredentials** | [**CordaNodeSshCredentials**](CordaNodeSshCredentials.md) |  | 
**rpcCredentials** | [**CordaRpcCredentials**](CordaRpcCredentials.md) |  | 
**cordaNodeStartCmd** | **kotlin.String** | The shell command to execute in order to start back up a Corda node after having placed new jars in the cordapp directory of said node. | 
**cordappDir** | **kotlin.String** | The absolute file system path where the Corda Node is expecting deployed Cordapp jar files to be placed. | 
**cordaJarPath** | **kotlin.String** | The absolute file system path where the corda.jar file of the node can be found. This is used to execute database schema migrations where applicable (H2 database in use in development environments). | 
**nodeBaseDirPath** | **kotlin.String** | The absolute file system path where the base directory of the Corda node can be found. This is used to pass in to corda.jar when being invoked for certain tasks such as executing database schema migrations for a deployed contract. | 



