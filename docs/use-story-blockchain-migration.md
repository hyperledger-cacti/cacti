---
name: User Story template
about: Create a user story for Blockchain Integration Framework
title: 'Blockchain Migration'
labels: ''
assignees: ''

---

### Description
#### Data Migration
As an organization, I would like to be able to perform a data migration from Hyperledger Fabric to Bitcoin. However, that requires lots of resources, and takes a long time.
I could use the Blockchain Migration feature from the Blockchain Integration Framework project to aid me with that. Firstly, I could know in real time the characteristics about Bitcoin that would influence my decision.
In particular, I could see the cost of writting information to Bitcoin, the exchange rate US dollar - Bitcoin, the average time to mine a block, the transaction throughput, and the network hash rate ((Frauenthaler et al., 2019). 
Based on that, the framework proposes me a migration, with indicators such as predicted cost, predicted time to complete migration, and likelyhood of success.
As Bitcoin does not show a desirable throughput, I choose the Ethereum option. As it yields a higher throughput, I then migrate my solution from Fabric to Ethereum, without compromising the solution in production.

#### Smart Contracts
Similar to the previous use case, but extra metrics are considered. For example, if the target blockchain's virtual machine can support the computational complexity of the source blockchain.
Tools to aid developers perform smart contract migration, are used.

### Notes
Might relate to points on section 4.1 from the whitepaper. 

**References**
Philipp Frauenthaler, Michael Borkowski, and Stefan Schulte. 2019. A Framework for Blockchain Interoperability and Runtime Selection.