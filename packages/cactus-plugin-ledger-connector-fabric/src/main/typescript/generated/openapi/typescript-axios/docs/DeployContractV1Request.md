# DeployContractV1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**ccLang** | [**ChainCodeProgrammingLanguage**](ChainCodeProgrammingLanguage.md) |  | [default to undefined]
**caFile** | **string** | CA certificate file that will be used to verify the TLS connection to the orderer. | [default to undefined]
**orderer** | **string** | Ordering service endpoint specified as &lt;hostname or IP address&gt;:&lt;port&gt; | [default to undefined]
**ordererTLSHostnameOverride** | **string** | The hostname override to use when validating the TLS connection to the orderer | [default to undefined]
**connTimeout** | **number** | Timeout for client to connect (default 3s) | [optional] [default to undefined]
**signaturePolicy** | **string** | Passed in to the peer via the --signature-policy argument on the command line. See also: https://hyperledger-fabric.readthedocs.io/en/release-2.2/endorsement-policies.html#setting-chaincode-level-endorsement-policies | [optional] [default to undefined]
**collectionsConfigFile** | **string** | Name of the collections config file as present in the sourceFiles array of the request. | [optional] [default to undefined]
**channelId** | **string** | The name of the Fabric channel where the contract will get instantiated. | [default to undefined]
**targetOrganizations** | [**Array&lt;DeploymentTargetOrganization&gt;**](DeploymentTargetOrganization.md) |  | [default to undefined]
**constructorArgs** | [**DeployContractV1RequestConstructorArgs**](DeployContractV1RequestConstructorArgs.md) |  | [optional] [default to undefined]
**ccSequence** | **number** |  | [default to undefined]
**ccVersion** | **string** |  | [default to undefined]
**ccName** | **string** |  | [default to undefined]
**ccLabel** | **string** | Human readable label to uniquely identify the contract. Recommended to include in this at least the contract name and the exact version in order to make it easily distinguishable from other deployments of the same contract. | [default to undefined]
**sourceFiles** | [**Array&lt;FileBase64&gt;**](FileBase64.md) | The your-smart-contract.go file where the functionality of your contract is implemented. | [default to undefined]
**coreYamlFile** | [**FileBase64**](FileBase64.md) |  | [default to undefined]

## Example

```typescript
import { DeployContractV1Request } from './api';

const instance: DeployContractV1Request = {
    ccLang,
    caFile,
    orderer,
    ordererTLSHostnameOverride,
    connTimeout,
    signaturePolicy,
    collectionsConfigFile,
    channelId,
    targetOrganizations,
    constructorArgs,
    ccSequence,
    ccVersion,
    ccName,
    ccLabel,
    sourceFiles,
    coreYamlFile,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
