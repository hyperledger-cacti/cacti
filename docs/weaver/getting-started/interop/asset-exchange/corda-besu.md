---
id: corda-besu
title: "Asset Exchange: Corda with Besu"
sidebar_label: Corda with Besu
pagination_label: Corda with Besu
pagination_prev: external/getting-started/interop/asset-exchange/overview
---

We will demonstrate asset exchange of an `AliceERC721` NFT in Besu `network1` with `10` tokens on `Corda_Network`.
For Besu commands, run from `weaver/weaver/samples/besu/besu-cli` folder, and for Corda commands, run from `samples/corda/corda-simple-application` folder, in your clone of the Cacti repository. Here `Alice` with account `1` and `Bob` with account `2` in Besu `network1` correspond to `PartyA` (`CORDA_PORT=10006`) and `PartyB` (`CORDA_PORT=10009`) in `Corda_Network` respectively. Following are the step-by-step asset exchange process:

1. From corda client, generate secret-hash pair using following command (prints hash in base64):
  ```
  ./clients/build/install/clients/bin/clients utils hash --hash-fn=SHA256 -s secrettext
  ```
2. Run the following to verify the status of the tokens owned by `PartyA` and `PartyB` in the `Corda_Network` and `Corda_Network2`:
  ```bash
  ./scripts/getAssetStatus.sh 2
  ```
3. Run the following in `besu-cli`, to verify the status of the assets owned by `Alice` and `Bob` in the Besu networks:
  ```bash
  ./bin/besu-cli asset get-balance --network=network1 --account=1
  ./bin/besu-cli asset get-balance --network=network1 --account=2
  ```
4. Complete the asset exchange using following steps:
    - Run the following to trigger `alice` locking `AliceERC721` token with id `0` for `bob` in `network1` for 1 hour
      ```bash
      ./bin/besu-cli asset lock --network=network1 --sender_account=1 --recipient_account=2 --token_id=0 --asset_type=ERC721 --timeout=3600 --hash_base64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs=
      ```
      Note the `contract-id` printed as output in above command. The output line containing `contract-id` (text in base64 after `Lock contract ID:`) would like this:
      ```bash
      Lock contract ID: 48f59da2ac632117bf79b4aa986f5ece8a2439dc143d576965c17bc8275b0925
      ```
    - Run the following to verify `alice`'s lock, replacing `<contract-id>` with actual `contract-id`:
      ```bash
      ./bin/besu-cli asset is-locked --network=network1 --lock_contract_id=<contract-id>
      ```
    - Run the following to trigger `PartyB` locking `50` units of token type `t1` for `PartyA` in `Corda_Network` for 30 mins:
      ```bash
      CORDA_PORT=10009 ./clients/build/install/clients/bin/clients lock-asset --fungible --hashBase64=ivHErp1x4bJDKuRo6L5bApO/DdoyD/dG0mAZrzLZEIs= --timeout=1800 --recipient="O=PartyA,L=London,C=GB" --param=t1:50
      ```
      Note the `contract-id` displayed after successful execution of the command, will be used in next steps. The output containing `contract-id` would like this:
      ```bash
      HTLC Lock State created with contract ID Right(b=10448674_80d2bee7-5a5d-45df-b14e-60bac4ba1bf3).
      ```
      `contract-id` is the alphanumeric text (with underscore and hyphens) after `b=` within parenthesis. Let's refer it `<contract-id-2>` for this demonstration.
    - Run the following to verify `PartyB`'s lock (can be verified by both parties):
      ```bash
      CORDA_PORT=10006 ./clients/build/install/clients/bin/clients is-asset-locked --contract-id=<contract-id-2>
      ```
    - Run the following to trigger `PartyA`'s claim for `50` units of token type `t1` locked by `PartyB` in `Corda_Network`:
      ```bash
      CORDA_PORT=10006 ./clients/build/install/clients/bin/clients claim-asset --secret=secrettext --contract-id=<contract-id-2>
      ```
      `PartyB` can see its node's logs to get the revealed hash preimage, and use it to claim in the Besu network.
    - Run the following to trigger `bob`'s claim for `AliceERC721` NFT with id `0` locked by `alice` in `network1`:
      ```bash
      ./bin/besu-cli asset claim --network=network1 --recipient_account=2 --preimage=secrettext --token_id=0 --lock_contract_id=<contract-id>
      ```

    The above steps complete a successful asset exchange between two Besu networks. 
    In addition to the above commands, following commands can be run if specified timeout has expired and the locked asset remains unclaimed.
    - If `alice` wants to unlock the asset, run the following to trigger `alice`'s re-claim for `AliceERC721` NFT with id `0` locked in `network1`:
      ```bash
      ./bin/besu-cli asset unlock --network=network1 --lock_contract_id=<contract-id> --sender_account=1 --token_id=0
      ```
    - If `PartyB` wants to unlock the token asset, run the following to trigger unlock for `t1:50` locked in `Corda_Network`:
      ```bash
      CORDA_PORT=10009 ./clients/build/install/clients/bin/clients unlock-asset --contract-id=<contract-id>
      ```
5. Run the following to verify the status of the tokens owned by `PartyA` and `PartyB` in the `Corda_Network` and `Corda_Network2`:
  ```bash
  ./scripts/getAssetStatus.sh 2
  ```
6. Run the following in `besu-cli`, to verify the status of the assets owned by `Alice` and `Bob` in the Besu networks:
  ```bash
  ./bin/besu-cli asset get-balance --network=network1 --account=1
  ./bin/besu-cli asset get-balance --network=network1 --account=2
  ```
