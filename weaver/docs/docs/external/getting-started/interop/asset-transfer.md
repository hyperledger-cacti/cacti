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

This document lists sample ways in which you can exercise the asset-transfer interoperation protocol on the test network [launched earlier](external/getting-started/test-network/overview.md).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger the following interoperation flows corresponding to distinct asset-sharing combinations _other combinations of DLTs will be supported soon_):
## 1. Fabric with Fabric

One Fabric network transfers either a bond or some tokens owned by Alice to Bob in the other network

Assuming that the `simpleassettransfer` chaincode has been deployed in both networks, run the following steps by navigating to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).

### Transfer or recover a bond (non-fungible) asset

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

### Transfer or recover token (fungible) assets

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
One Corda network transfers either a bond or some tokens owned by the party `PartyA` (`CORDA_PORT=10006`) to the party `PartyA` (`CORDA_PORT=30006`) in the other network.

### Transfer or recover token (fungible) assets
Assume that the CorDapp `cordaSimpleApplication` has been deployed in both networks.
- Navigate to `samples/corda/corda-simple-application` folder.
- Add `5` tokens of type `t1` to `PartyA` in `Corda_Network`:
  ```bash
  NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients issue-asset-state 5 t1
  ```
  (check token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1`)
- Let `PartyA` pledge these tokens in `Corda_Network` to be transferred to `PartyA` of `Corda_Network2` (pledge burns the tokens in the source/exporting network):
  ```bash
  NETWORK_NAME='Corda_Network' CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer pledge-asset --fungible --timeout="3600" --import-network-id='Corda_Network2' --recipient='O=PartyA, L=London, C=GB' --param='t1:5'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>` which is a hexadecimal string (pledge details can be cross checked using the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer is-asset-pledged -pid <pledge-id>` and `CORDA_PORT=10006  ./clients/build/install/clients/bin/clients transfer get-pledge-state -pid <pledge-id>`).
- Check the token asset balance for `PartyA` in `Corda_Network` by running the below command, and the output should not include the asset `t1:5` issued earlier.
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1
  ``` 
- Let `PartyA` claim in `Corda_Network2` the tokens which are pledged in the Corda network `Corda_Network` by replacing `<pledge-id>` with the above hexadecimal value (claim issues the tokens in the destination/importing network):
  ```bash
  NETWORK_NAME='Corda_Network2' CORDA_PORT=30006 ./clients/build/install/clients/bin/clients transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='O=PartyA, L=London, C=GB' --transfer-category='token.corda' --export-network-id='Corda_Network' --param='t1:5' --import-relay-address='localhost:9082'
  ```
  (the `linear-id`, which is displayed after successful execution of the above command, can be used to check the newly issued tokens for `PartyA` in `Corda_Network2` by running `CORDA_PORT=30006 ./clients/build/install/clients/bin/clients get-state-using-linear-id <linear-id>`; or simply check the token balance for `PartyA` by running the command `CORDA_PORT=30006 ./clients/build/install/clients/bin/clients get-asset-states-by-type t1` which should output `5` tokens of type `t1`)

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Corda network `Corda_Network2`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the token `t1:5` asset, which will succeed only if the asset was not claimed by `PartyA` in `Corda_Network2` and the pledge has expired:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer reclaim-pledged-asset --pledge-id=<pledge-id> --export-relay-address='localhost:9081' --transfer-category='token.corda' --import-network-id='Corda_Network2' --param='t1:5'
  ```

### Transfer or recover bond (non-fungible) assets
Assume that the CorDapp `cordaSimpleApplication` has been deployed in both networks.
- Navigate to `samples/corda/corda-simple-application` folder.
- Add a bond asset with id `a10` and type `bond01` to `PartyA` in `Corda_Network`:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients bond issue-asset 'a10' 'bond01'
  ```
  (check token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients bond get-assets-by-type 'bond01'`)
- Let `PartyA` pledge these tokens in `Corda_Network` to be transferred to `PartyA` of `Corda_Network2` (pledge burns the tokens in the source/exporting network):
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer pledge-asset --timeout="3600" --import-network-id='Corda_Network2' --recipient='O=PartyA, L=London, C=GB' --param='bond01:a10'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>` which is a hexadecimal string (pledge details can be cross checked using the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer is-asset-pledged -pid <pledge-id>` and `CORDA_PORT=10006  ./clients/build/install/clients/bin/clients transfer get-pledge-state -pid <pledge-id>`).
- Check the bond asset balance for `PartyA` in `Corda_Network` by running the below command, and the output should not include the asset `bond01:a10` issued earlier.
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients bond get-assets-by-type 'bond01'`
  ``` 
- Let `PartyA` in `Corda_Network2` claim the bond asset which is pledged in the Corda network `Corda_Network` by replacing `<pledge-id>` with the above hexadecimal value (claim issues the bond asset in the destination/importing network):
  ```bash
  NETWORK_NAME=Corda_Network2 CORDA_PORT=30006 ./clients/build/install/clients/bin/clients transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='O=PartyA, L=London, C=GB' --transfer-category='bond.corda' --export-network-id='Corda_Network' --param='bond01:a10' --import-relay-address='localhost:9082'
  ```
  (the `linear-id`, which is displayed after successful execution of the above command, can be used to check the newly issued bond asset for `PartyA` in `Corda_Network2` by running `CORDA_PORT=30006 ./clients/build/install/clients/bin/clients bond get-asset-by-linear-id <linear-id>`; or simply check the bond asset balance for `PartyA` by running the command `CORDA_PORT=30006 ./clients/build/install/clients/bin/clients bond get-assets-by-type 'bond01'` which should output asset with id `a10` and type `bond01`)

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Corda network `Corda_Network2`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the bond asset `bond01:a10`, which will succeed only if the asset was not claimed by `PartyA` and the pledge has expired:
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer reclaim-pledged-asset --pledge-id=<pledge-id> --export-relay-address='localhost:9081' --transfer-category='bond.corda' --import-network-id='Corda_Network2' --param='bond01:a10'
  ```

## 3. Fabric with Corda
A Fabric network transfers some tokens owned by `Alice` to `PartyA` (`CORDA_PORT=10006`) in a Corda network.

### Transfer or recover token (fungible) assets

Assuming that the `simpleassettransfer` chaincode has been deployed in Fabric network `network1`, run the following steps related to Fabric by navigating to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).

Similarly, assuming that the CorDapp `cordaSimpleApplication` has been deployed in the Corda network `Corda_Network`, run the following steps related to Corda by navigating to the `samples/corda/corda-simple-application` folder.
- Verify that `alice` in `network1` owns `10000` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
- Get `alice` in `network1` to pledge 50 tokens to `PartyA` in `Corda_Network` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network='network1' --dest-network='Corda_Network' --recipient='O=PartyA, L=London, C=GB' --expiry-secs=3600 --type='token' --units=50 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).

- Verify that `alice` in `network1` owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
- Let `PartyA` claim in `Corda_Network` the tokens which are pledged in the Fabric network `network1` by replacing `<pledge-id>` with the above hexadecimal value (claim issues the tokens in the destination/importing network):
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='alice' --transfer-category='token.fabric' --export-network-id='network1' --param='token1:50' --import-relay-address='localhost:9081'
  ```
  (the `linear-id`, which is displayed after successful execution of the above command, can be used to check the newly issued tokens for `PartyA` in `Corda_Network` by running `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-state-using-linear-id <linear-id>`; or simply check the token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type token1` which should output `50` tokens of type `token1`)

The above steps complete a successful asset transfer from the Fabric network `network1` to the Corda network `Corda_Network`. Below demostrates re-claim of the tokens pledged in the Fabric network after the pledge expiry.

- Now get `alice` in `network1` to pledge 100 tokens to `PartyA` in `Corda_Network` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset transfer pledge --source-network='network1' --dest-network='Corda_Network' --recipient='O=PartyA, L=London, C=GB' --expiry-secs=60 --type=token --units=100 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).

   Wait for a minute as follows:
   ```bash
   sleep 60
   ```

- Let `PartyA` in `Corda_Network` claim the tokens which are pledged in the Fabric network `network1` by replacing `<pledge-id>` with the above hexadecimal value (claim issues the tokens in the destination/importing network):
   ```bash
   NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer claim-remote-asset --pledge-id='<pledge-id>' --locker='alice' --transfer-category='token.fabric' --export-network-id='network1' --param='token1:100' --import-relay-address='localhost:9080'
   ```
   This should fail as the pledge has already expired.

   (check the token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type token1` which should still show `50` tokens of type `token1` but not `150`)
- Now get `alice` in `network1` to reclaim these tokens as follows:
   ```bash
   ./bin/fabric-cli asset transfer reclaim --source-network='network1' --user='alice' --type='token.corda' --pledge-id=<pledge-id> --param=token1:100
   ```
- Verify that `alice` in `network1` still owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```

## 4. Corda with Fabric
A Corda network transfers some tokens owned by `PartyA` (`CORDA_PORT=10006`) to `Alice` in a Fabric network.

### Transfer or recover token (fungible) assets

Assuming that the CorDapp `cordaSimpleApplication` has been deployed in the Corda network `Corda_Network`, run the following steps related to Corda by navigating to the `samples/corda/corda-simple-application` folder.

Similarly, assume that the `simpleassettransfer` chaincode has been deployed in Fabric network `network1`, run the following steps related to Fabric by navigating to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).
- Add `5` tokens of type `token1` to `PartyA` in `Corda_Network`:
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients issue-asset-state 5 token1
  ```
  (check token balance for `PartyA` by running the command `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type token1`)
- Let `PartyA` pledge (with a 1 hour timeout) these tokens in `Corda_Network` to be transferred to `Alice` of Fabric network `network1` (pledge burns the tokens in the source/exporting network):
  ```bash
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer pledge-asset --fungible --timeout="3600" --import-network-id='network1' --recipient='alice' --param='token1:5'
  ```
  Note the `pledge-id` displayed after successful execution of the command, which will be used in next steps. Let's denote it `<pledge-id>` which is a hexadecimal string (pledge details can be cross checked using the commands `CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer is-asset-pledged -pid <pledge-id>` and `CORDA_PORT=10006  ./clients/build/install/clients/bin/clients transfer get-pledge-state -pid <pledge-id>`).
- Check the token asset balance for `PartyA` in `Corda_Network` by running the below command, and the output should not include the asset `token1:5` issued earlier.
  ```
  CORDA_PORT=10006 ./clients/build/install/clients/bin/clients get-asset-states-by-type token1`
  ``` 
- Verify that `alice` in `network1` owns `10000` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
- Get `alice` in `network` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./bin/fabric-cli asset transfer claim --source-network='Corda_Network' --dest-network=network1 --user='alice' --owner='O=PartyA, L=London, C=GB' --type='token.corda' --pledge-id=<pledge-id> --param=token1:5
   ```
- Verify that `alice` in `network` now owns `1050` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```

The above steps complete a successful asset transfer from the Corda network `Corda_Network` to the Fabric network `network1`. In addition to the above commands, following is an extra option.

- Let `PartyA` in `Corda_Network` try re-claim the token `token1:5` asset, which will succeed only if the asset was not claimed by `alice` in Fabric network and the pledge has expired (replace `<pledge-id>` with the above hexadecimal value):
  ```bash
  NETWORK_NAME=Corda_Network CORDA_PORT=10006 ./clients/build/install/clients/bin/clients transfer reclaim-pledged-asset --pledge-id=<pledge-id> --export-relay-address='localhost:9081' --transfer-category='token.fabric' --import-network-id='network1' --param='token1:5'
  ```