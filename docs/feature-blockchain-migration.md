---
name: Feature request
about: Suggest an idea for this project
title: 'Blockchain Migration'
labels: feature
assignees: ''

---

**Is your feature request related to a problem? Please describe.**
The suitability of a blockchain solution regarding a use case depends on the underlying blockchain properties.
As blockchain technologies are maturing at a fast pace, in particular private blockchains, its properties might change. Consequently, this creates an unbalance between user expectations' and the applicability of the solution.
It is, therefore, quite useful for an organization to be able to monitor several blockchains to, based on their properties, provide a competitive advantage in terms of flexibility and catastrophe handling.
A framework could monitor and perform in a (semi) automatic way blockchain migrations. It should be flexible enough to empower the end-user to propose a set of functional and non-functional requirements.
This migration feature is particularly important regarding enterprise blockchain systems (i.e., mainly with permissioned blockchains), as the risk associated with a blockchain solution deployment (e.g., blockchain becoming obsolete, cryptographic algorithms no longer secure) can hinder its mass adoption.


**Describe the solution you'd like**
It is then proposed the development of a platform that can ease this task.
Two modules could be considered: a monitoring module, that verifies the suitability of the available blockchains for a specific use case, and a migration module.
The migration module should include tools that help to perform a semi-automatic/automatic migration.
In particular, the tool should be able to capture the transactions that are being processing at the time of the migration; meanwhile, the migration process happens for later processing.

**Describe alternatives you've considered**
Currently, the alternative is to re-implement business logic using a different platform, yielding great effort. 
This is one of the reasons mass adoption amongst enterprises grows slowly.

**Additional context**
Automatic smart contract migration probably yields to many risks for enterprise blockchain systems. This implies that the solution is non-trivial.
Data migrations have been performed by (Frauenthaler et al., 2019) and (Scheid et al., 2019), both recent endeavors to render flexibility to blockchain-based solutions.r
In those works, the authors propose simple data migration capabilities for public, permissionless blockchains, in which a user can specify requirements for its blockchain. The developed solutions allow "switchovers," where a blockchain is migrated, in case there is a blockchain that better satisfies the current requirements.
Nonetheless, arguably a more interesting approach would be to consider cross-smart contract execution functionality or another automatic way of migration.

**References**
E Scheid and Burkhard Rodrigues, B Stiller. 2019. Toward a policy-based blockchain agnostic framework. 16th IFIP/IEEE International Symposium on Integrated Network Management (IM 2019) (2019)
Philipp Frauenthaler, Michael Borkowski, and Stefan Schulte. 2019. A Framework for Blockchain Interoperability and Runtime Selection.