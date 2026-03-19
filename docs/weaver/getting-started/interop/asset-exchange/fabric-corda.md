---
id: fabric-corda
title: "Asset Exchange: Fabric with Corda"
sidebar_label: Fabric with Corda
pagination_label: Fabric with Corda
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

We will demonstrate asset exchange of a bond in Fabric `network1` with tokens on `Corda_Network`.
For Fabric commands, run from `weaver/samples/fabric/fabric-cli` folder, and for Corda commands, run from `weaver/samples/corda/corda-simple-application` folder, in your clone of the Cacti repository. Here `Alice` and `Bob` in Fabric `network1` correspond to `PartyA` (`CORDA_PORT=10006`) and `PartyB` (`CORDA_PORT=10009`) in `Corda_Network` respectively. Following are the step-by-step asset exchange process:

| Notes |
|:------|
| The hash used in following steps can be replaced by any valid `SHA256` hash. |

- Run the following to verify the status of the bond assets owned by `alice` and `bob` in the Fabric network `network1` from `weaver/samples/fabric/fabric-cli` folder:
 ```bash
 ./scripts/getAssetStatus.sh
 ```
- Run the following to verify the status of the assets owned by `PartyA` and `PartyB` in the `Corda_Network` from `weaver/samples/corda/corda-simple-application` folder:
  ```bash
  ./scripts/getAssetStatus.sh
  ```
- Generate Secret-Hash Pair using following command (prints hash in base64):
  ```
  ./bin/fabric-cli hash --hash_fn=SHA256 secrettext
  ```
- Run the following to trigger `alice` locking `bond01:a03` for `bob` in `network1` for 60 mins:
  ```bash
  ./bin/fabric-cli asset exchange lock --timeout-duration=3600 --locker=alice --recipient=bob --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --target-network=network1 --param=bond01:a03
  ```
- Run the following to verify `alice`'s lock:
  ```bash
  ./bin/fabric-cli asset exchange is-locked --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
  ```
- Run the following to trigger `PartyB` locking `50` units of token type `t1` for `PartyA` in `Corda_Network` for 30 mins:
  ```bash
  CORDA_PORT=10009 ./clients/build/install/clients/bin/clients lock-asset --fungible --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --timeout=1800 --recipient="O=PartyA,L=London,C=GB" --param=t1:50
  ```
  Note the `contract-id` displayed after successful execution of the command, will be used in next steps. The output containing `contract-id` would like this:
  ```bash
  HTLC Lock State created with contract ID Right(b=10448674_80d2bee7-5a5d-45df-b14e-60bac4ba1bf3).
  ```
  `contract-id` is the alphanumeric text (with underscore and hyphens) after `b=` within parenthesis.
- Run the following to verify `PartyB`'s lock (can be verified by both parties):
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients is-asset-locked --contract-id=<contract-id>
  ```
- Run the following to trigger `PartyA`'s claim for `50` units of token type `t1` locked by `PartyB` in `Corda_Network`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients claim-asset --secret=secrettext --contract-id=<contract-id>
  ```
  `PartyB` can see its node's logs to get the revealed hash preimage, and use it to claim the bond in the Fabric network.
- Run the following to trigger `bob`'s claim for `bond01:a03` locked by `alice` in `network1`:
  ```bash
  ./bin/fabric-cli asset exchange claim --recipient=bob --locker=alice --target-network=network1 --param=bond01:a03 --secret=secrettext
  ```
- Run the following to verify the status of the bond assets owned by `alice` and `bob` in the Fabric network `network1` from `weaver/samples/fabric/fabric-cli` folder:
   ```bash
   ./scripts/getAssetStatus.sh
   ```
- Run the following to verify the status of the assets owned by `PartyA` and `PartyB` in the `Corda_Network` from `weaver/samples/corda/corda-simple-application` folder:
  ```bash
  ./scripts/getAssetStatus.sh
  ```

The above steps complete a successful asset exchange between Fabric and Corda networks. 
In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.

- If `alice` wants to unlock the bond asset, run the following to trigger `alice`'s re-claim for `bond01:a03` locked in `network1`:
  ```bash
  ./bin/fabric-cli asset exchange unlock --locker=alice --recipient=bob --target-network=network1 --param=bond01:a03
  ```
- If `PartyB` wants to unlock the token asset, run the following to trigger unlock for `t1:50` locked in `Corda_Network`:
  ```bash
  CORDA_PORT=10009 ./clients/build/install/clients/bin/clients unlock-asset --contract-id=<contract-id>
  ```
