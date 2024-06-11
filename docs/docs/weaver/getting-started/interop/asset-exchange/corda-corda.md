---
id: corda-corda
title: "Asset Exchange: Corda with Corda"
sidebar_label: Corda with Corda
pagination_label: Corda with Corda
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

We will demonstrate asset exchange of a tokens in `Corda_Network` with tokens on `Corda_Network2`. Here `PartyA` (`CORDA_PORT=10006`) and `PartyB` (`CORDA_PORT=10009`) in `Corda_Network` correspond to `PartyA` (`CORDA_PORT=30006`) and `PartyB` (`CORDA_PORT=30009`) in `Corda_Network2` respectively. Following are the step-by-step asset exchange process:

| Notes |
|:------|
| The hash used in following steps can be replaced by any valid `SHA256` hash. |

- Navigate to the `weaver/samples/corda/corda-simple-application` folder in your clone of the Cacti repository.
- Run the following to verify the status of the tokens owned by `PartyA` and `PartyB` in the `Corda_Network` and `Corda_Network2`:
  ```bash
  ./scripts/getAssetStatus.sh 2
  ```
- Generate Secret-Hash Pair using following command (prints hash in base64):
  ```
  ./clients/build/install/clients/bin/clients utils hash --hash-fn=SHA256 -s secrettext
  ```
- Run the following to trigger `PartyA` locking `30` units of token type `t1` for `PartyB` in `Corda_Network` for 60 mins:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients lock-asset --fungible --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --timeout=3600 --recipient="O=PartyB,L=London,C=GB" --param=t1:30
  ```
  Note the `contract-id` displayed after successful execution of the command, will be used in next steps. The output containing `contract-id` would like this:
  ```bash
  HTLC Lock State created with contract ID Right(b=10448674_80d2bee7-5a5d-45df-b14e-60bac4ba1bf3).
  ```
  `contract-id` is the alphanumeric text (with underscore and hyphens) after `b=` within parenthesis. Let's denote it `<contract-id-1>`.
- Run the following to verify `PartyA`'s lock (can be verified by both parties):
  ```bash
  CORDA_PORT=10009 ./clients/build/install/clients/bin/clients is-asset-locked --contract-id=<contract-id-1>
  ```
- Run the following to trigger `PartyB` locking `50` units of token type `t2` for `PartyA` in `Corda_Network2` for 30 mins:
  ```bash
  CORDA_PORT=30009 ./clients/build/install/clients/bin/clients lock-asset --fungible --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --timeout=1800 --recipient="O=PartyA,L=London,C=GB" --param=t2:50
  ```
  Note the `contract-id` displayed after successful execution of the command, will be used in next steps. Let's denote it `<contract-id-2>`.
- Run the following to verify `PartyB`'s lock (can be verified by both parties):
  ```bash
  CORDA_PORT=30006 ./clients/build/install/clients/bin/clients is-asset-locked --contract-id=<contract-id-2>
  ```
- Run the following to trigger `PartyA`'s claim for `50` units of token type `t2` locked by `PartyB` in `Corda_Network2`:
  ```bash
  CORDA_PORT=30006 ./clients/build/install/clients/bin/clients claim-asset --secret=secrettext --contract-id=<contract-id-2>
  ```
  `PartyB` can see its node's logs to get the revealed hash preimage, and use it to claim the bond in the Fabric network.
- Run the following to trigger `PartyB`'s claim for `30` units of token type `t1` locked by `PartyA` in `Corda_Network`:
  ```bash
  CORDA_PORT=10009 ./clients/build/install/clients/bin/clients claim-asset --secret=secrettext --contract-id=<contract-id-1>
  ```
- Run the following to verify the status of the tokens owned by `PartyA` and `PartyB` in the `Corda_Network` and `Corda_Network2`:
  ```bash
  ./scripts/getAssetStatus.sh 2
  ```


The above steps complete a successful asset exchange between two Corda networks. 
In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

- If `PartyA` wants to unlock the token `t1:30` asset, run the following to trigger `PartyA`'s re-claim in `Corda_Network`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients unlock-asset --contract-id=<contract-id-1>
  ```
- If `PartyB` wants to unlock the token `t2:50` asset, run the following to trigger `PartyB`'s re-claim in `Corda_Network2`:
  ```bash
  CORDA_PORT=30009 ./clients/build/install/clients/bin/clients unlock-asset --contract-id=<contract-id-2>
  ```
