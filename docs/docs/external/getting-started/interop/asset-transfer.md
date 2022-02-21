---
id: asset-transfer
title: Asset Transfer
pagination_prev: external/getting-started/interop/overview
pagination_next: external/getting-started/enabling-weaver-network/overview
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the asset-transfer interoperation protocol on the test network [launched earlier](../test-network/overview).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger the following interoperation flows corresponding to distinct asset-sharing combinations _other combinations of DLTs will be supported soon_):
## 1. Fabric with Fabric

One Fabric network transfers either a bond or some tokens owned by Alice to Bob in the other network

Assuming that the `simpleassettransfer` chaincode has been deployed in both networks, run the following steps by navigating to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).

### **Transfer or recover a bond (non-fungible) asset**

1. Verify that `alice` owns bonds with ids `a03` and `a04` as follows:
   ```bash
   ./bin/fabric-cli chaincode query --user=alice mychannel simpleassettransfer ReadAsset '["bond01","a03"]' --local-network=network1
   ./bin/fabric-cli chaincode query --user=alice mychannel simpleassettransfer ReadAsset '["bond01","a04"]' --local-network=network1
   ```
   You should see a JSON structure corresponding to the bond being logged on the console in each case.
2. Get `alice` in `network1` to pledge bond `a03` to `bob` in `network2` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=bond --ref=a03 --data-file=src/data/assetsForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
3. Get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./bin/fabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=bob --owner=alice --type='bond.fabric' --pledge-id=<pledge-id> --param=bond01:a03
   ```
4. Verify that `alice` in `network1` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query --user=alice mychannel simpleassettransfer ReadAsset '["bond01","a03"]' --local-network=network1
   ```
   You should see an error message like `Error: the asset a03 does not exist`.
5. Verify that `bob` in `network2` now owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query --user=bob mychannel simpleassettransfer ReadAsset '["bond01","a03"]' --local-network=network2
   ```
6. Now get `alice` in `network1` to pledge bond `a04` to `bob` in `network2` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=bond --ref=a04 --data-file=src/data/assetsForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
7. Now get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./bin/fabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=bob --owner=alice --type='bond.fabric' --pledge-id=<pledge-id> --param=bond01:a04
   ```
   This should fail as the pledge has already expired.
8. Now get `alice` in `network1` to reclaim the asset as follows:
   ```bash
   ./bin/fabric-cli asset transfer reclaim --source-network=network1 --user=alice --type='bond.fabric' --pledge-id=<pledge-id> --param=bond01:a04
   ```
9. Verify that `alice` in `network1` owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query --user=alice mychannel simpleassettransfer ReadAsset '["bond01","a04"]' --local-network=network1
   ```
10. Verify that `bob` in `network2` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query --user=bob mychannel simpleassettransfer ReadAsset '["bond01","a04"]' --local-network=network2
   ```
   You should see an error message like `Error: the asset a04 does not exist`.

### **Transfer or recover token (fungible) assets**

1. Verify that `alice` in `network1` owns `10000` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
2. Verify that `bob` in `network2` owns no tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```
   You should see an error message like `Error: owner does not have a wallet`.
3. Get `alice` in `network1` to pledge 50 tokens to `bob` in `network2` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=token --units=50 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
4. Get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./bin/fabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=bob --owner=alice --type='token.fabric' --pledge-id=<pledge-id> --param=token1:50
   ```
5. Verify that `alice` in `network1` owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
6. Verify that `bob` in `network2` now owns `50` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```
7. Now get `alice` in `network1` to pledge 100 tokens to `bob` in `network2` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=token --units=100 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
8. Now get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./bin/fabric-cli asset transfer claim --source-network=network1 --dest-network=network2 --user=bob --owner=alice --type='token.fabric' --pledge-id=<pledge-id> --param=token1:100
   ```
   This should fail as the pledge has already expired.
9. Now get `alice` in `network1` to reclaim these tokens as follows:
   ```bash
   ./bin/fabric-cli asset transfer reclaim --source-network=network1 --user=alice --type='token.fabric' --pledge-id=<pledge-id> --param=token1:100
   ```
10. Verify that `alice` in `network1` still owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
11. Verify that `bob` in `network2` still owns only `50` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```

## 2. Corda with Corda
One Corda network transfers either a bond or some tokens owned by `PartyA` (`CORDA_PORT=10006`) to `PartyB` (`CORDA_PORT=30009`) in the other network.

### **Transfer or recover token (fungible) assets**
Assuming that the corDapp `cordaSimpleApplication` has been deployed in both networks.
- Navigate to `samples/corda/corda-simple-application` folder.
- Create a `network-id` for each Corda network. This is a network state, and will be available in the vault of all the parties which are members of the network (if required, run the command `./clients/build/install/clients/bin/clients transfer get-party-name` with `CORDA_PORT=10006` or `CORDA_PORT=30006` or `CORDA_PORT=30009` to fetch the name of the parties `PartyA` in `Corda_Network` or `PartyA` in `Corda_Network2` or `PartyB` in `Corda_Network2` respectively).
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients network-id create-state "Corda_Network" -m "O=PartyA,L=London,C=GB"
  CORDA_PORT=30009 ./clients/build/install/clients/bin/clients network-id create-state "Corda_Network2" -m "O=PartyA,L=London,C=GB;O=PartyB,L=London,C=GB"
  ```
  The above assumes that `Corda_Network` was started earlier with `1-node`, and `Corda_Network2` was started earlier with `2-nodes` (network state created in `Corda_Network` and `Corda_Network2` can be cross checked by running the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` and `CORDA_PORT=30009 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` respectively in these networks).
- Add `5` tokens of type `t1` to `PartyA` in `Corda_Network`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients issue-asset-state 5 t1
  ```
  (check token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1`)
- Let `PartyA` pledge these tokens in `Corda_Network` to be transferred to `PartyB` of `Corda_Network2` (pledge burns the tokens in the source/exporting network):
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer pledge-asset --fungible --timeout="3600" --import-network-id='Corda_Network2' --recipient='O=PartyB, L=London, C=GB' --param='t1:5'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>`
  (pledge details can be cross checked using the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer is-asset-pledged -pid <pledge-id>` and `CORDA_PORT=10006  ./clients/build/install/clients/bin/clients transfer get-pledge-state -pid <pledge-id>`; moreover, check the token asset balance for `PartyA` in `Corda_Network` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1` which should not include the asset `t1:5` issued earlier).
- Let `PartyB` claim in `Corda_Network2` the tokens which are pledged in the network (claim issues the tokens in the destination/importing network):
  ```bash
  NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='O=PartyA, L=London, C=GB' --transfer-category='token.corda' --export-network-id='Corda_Network' --param='t1:5' --import-relay-address='localhost:9082'
  ```
  (the `linear-id`, which is displayed after successful execution of the above command, can be used to check the newly issued tokens for `PartyB` by running `CORDA_PORT=30009 ./clients/build/install/clients/bin/clients get-state-using-linear-id <linear-id>`; or simply check the token balance for `PartyB` by running the command `CORDA_PORT=30009 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1` which should output `5` tokens of type `t1`)

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Corda network `Corda_Network2`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the token `t1:5` asset, which will succeed only if the asset was not claimed by `PartyB` and the pledge has expired:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer reclaim-pledged-asset --pledge-id=<pledge-id> --export-relay-address='localhost:9081' --transfer-category='token.corda' --import-network-id='Corda_Network2' --param='t1:5'
  ```

### **Transfer or recover token (Corda fungible house-token) assets**
Assuming that the corDapp `fungible-house-token` has been deployed in both networks.
- Navigate to `samples/corda/corda-simple-application` folder.
- Create a `network-id` for each Corda network. This is a network state, and will be available in the vault of all the parties which are members of the network (if required, run the command `./clients/build/install/clients/bin/clients transfer get-party-name` with `CORDA_PORT=10006`, or `CORDA_PORT=30006`, or `CORDA_PORT=30009` to fetch the name of the parties, `PartyA` of `Corda_Network`, or `PartyA` of `Corda_Network2`, or `PartyB` of `Corda_Network2` respectively).
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients network-id create-state "Corda_Network" -m "O=PartyA,L=London,C=GB"
  CORDA_PORT=30009 ./clients/build/install/clients/bin/clients network-id create-state "Corda_Network2" -m "O=PartyA,L=London,C=GB;O=PartyB,L=London,C=GB"
  ```
  The above assumes that `Corda_Network` was started earlier with `1-node`, and `Corda_Network2` was started earlier with `2-nodes` (network state created in `Corda_Network` and `Corda_Network2` can be cross checked by running the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` and `CORDA_PORT=30009 ./clients/build/install/clients/bin/clients network-id retrieve-state-and-ref` respectively in these networks).
- Initialize Corda fungible house tokens in `Corda_Network` and `Corda_Network2`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token init
  CORDA_PORT=30009 ./clients/build/install/clients/bin/clients house-token init
  ```
- Issue `100` house-tokens to `PartyA` in `Corda_Network`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token issue -p "O=PartyA, L=London, C=GB" -a 100
  ```
  (check token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance`)
- Let `PartyA` pledge these tokens in `Corda_Network` to be transferred to `PartyB` of `Corda_Network2` (pledge burns the tokens in the source/exporting network):
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer pledge-asset --fungible --timeout="3600" --import-network-id='Corda_Network2' --recipient='O=PartyB, L=London, C=GB' --param='house:5'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>`
  (pledge details can be cross checked using the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer is-asset-pledged -pid <pledge-id>` and `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer get-pledge-state -pid <pledge-id>`; moreover, check the token balance for `PartyA` in `Corda_Network` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token get-balance` which should output 95 house tokens).
- Let `PartyB` claim in `Corda_Network2` the tokens which are pledged in the network (claim issues the tokens in the destination/importing network):
  ```bash
  NETWORK_NAME=Corda_Network2 CORDA_PORT=30009 ./clients/build/install/clients/bin/clients house-token transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='O=PartyA, L=London, C=GB' --transfer-category='house-token.corda' --export-network-id='Corda_Network' --param='house:5' --import-relay-address='localhost:9082'
  ```
  (check the token balance for `PartyB` in `Corda_Network2` by running the command `CORDA_PORT=30009 ./clients/build/install/clients/bin/clients house-token get-balance` which should output `5` house tokens)

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Corda network `Corda_Network2`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the token `house:5` asset, which will succeed only if the house-token asset was not claimed by `PartyB` and the pledge has expired:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients house-token transfer reclaim-pledged-asset --pledge-id='<pledge-id>' --export-relay-address='localhost:9081' --transfer-category='house-token.corda' --import-network-id='Corda_Network2' --param='house:5'
  ```