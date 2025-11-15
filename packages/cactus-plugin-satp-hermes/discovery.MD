# SATP + Kademlia

Git of Kademlia implementation for gateway discovery

https://github.com/joaoecsde/kademlia_tese

Important files of this repository are the src/node where all the protocols for kademlia and gateway discovery/storage are located. 

In the src/gateway it’s the gateway interface. 

In the src/crypto it’s the encryption of the payloads (using RSA and AES). 

In the src/http/routes it’s where it’s configured which calls can be done (if not mistaken not all calls work, but the important ones, meaning, the gateway operations one are working correctly). 

In the src/http/controller it’s the controller. 

In the src/simulation.ts, in the for loop it can be chosen how many nodes are deployed in a simulation (in the case of satp i would suggest i=5), and in the sec/node/constants.ts it's where you can choose the bit_size and k_buckets and more (the constants that are already in the file are prepared for a simple satp satup)

In this git it’s where a local implementation of the kademlia network and satp where deployed, using a older version of satp.
https://github.com/joaoecsde/cacti/tree/kademlia-gateway

The test created satp-kademlia-e2e-transfer.test.ts included in line 112 unhealthy=true because during the tests, the gateways were not contactable by the kademlia nodes, and this filter allows kademlia to show all the gateways that are online and offline.

At the moment this implementation allows for satp to work with “static” gateways and with kademlia, meaning that it does not break the older tests.