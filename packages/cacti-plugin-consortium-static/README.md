# `@hyperledger/cacti-plugin-consortium-static`

## Cacti Consortium Static

This plugin is an improvement of the package /cactus-plugin-consortium-manual ,bringing some new features to the table while conserving the possibility to be used as the old one (not allowing runtime changes)

### Add Nodes to Consortium

It is possible to add a new node to the consortium using the api of the plugin. 

New nodes need to belong/be certified by one of the organizations that are part of the consortium. On creating the consortium, it is required to specify the public keys of the organizations that are part of the consortium. When a new node requests to join, the request carries a jwt token signed by the organization it is tied to, which serves as proof that the organization reccognises the new node identity.

When a new node submits a request to join, the receiving node verifies the request and broadcasts it (or not, depending on the verification) to the remaining nodes in the consortium. There is no consensus or reliable broadcast implemented. All the other nodes submit the request to the same verification process. If, for some reason, there are disparities in the consortiumDatabases of each node, either it is due to a network issue (broadcast did not reach destination) or due to malfunction of some node.


### Consortium Repository

In addition to the default consortium repository (in cactus-core), the new repository includes data about the Node the repository belongs to:
```typescript
//data about self
  private readonly node: CactusNode;
  private readonly ledgers: Ledger[];
  private readonly pluginInstances: PluginInstance[];
  private readonly memberId: string;
```
It also includes the root PolicyGroup of the consortium (explained in next section), and the common configurations of the packages deployed by nodes within the consortium.

We do not verify if the nodes actually apply these configurations and policies, the information so far is used just to check that nodes have knowledge of this settings. Compliance or not is at the responsibility of each node, and to be verified if necessary by other means.

To verify new nodes have the same policies and package configs as the others already in the consortium, we deterministically build two merkle trees (one with each info), concat both roots, and each node verifies the result against their own policies and package common configs.

As a result of this proccess, nodes with divergent policies and configs are not accepted in the consortium (we assume all nodes are correctly configured when the network is created).

### Policy Model

We introduce in this package a proposal of a general-purpose policy model based in work done by the IETF: Core Policy Framework [RFC3060](https://www.rfc-editor.org/rfc/rfc3060).

The model (simplified version) can be viewed in the policy-model directory.

As a brief description, we group PolicyRules in PolicyGroups. PolicyGroups contain PolicyRules and possibly other PolicyGroups. A PolicyRule is composed by a PolicyCondition (constraint to be verified prior to applying the policy) and a PolicyAction (action to be applied).

Below a simplified UML with the relationships between the classes:

![policy model uml](https://github.com/eduv09/images/blob/main/policy-model-uml.jpg)

The consortium information needs to hold only the root policyGroup (others are reached going down in the hierarchy). Each PolicyGroup has a Role. Roles identify the scope of the policy, so a PolicyRule has a set of Roles (role of the group it belongs to, and groups higher in the hierarchy).

The model is in an early stage, and serves only as a POC for now. The goal is to refine it, and possibly move it to cactus-core once if it is accepted by the community as a advantageous feature. It is possible to create consortium without any policy rule or group defined.



## Notes

Please reffer to package "@hyperledger/cactus-plugin-consortium-manual" as the documentation there applies to this one, namely information about the Prometheus Exporter.

For usage, check the tests in the /integration folder