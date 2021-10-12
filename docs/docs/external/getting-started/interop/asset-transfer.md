---
id: asset-transfer
title: Asset Transfer
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the asset-transfer interoperation protocol on the test network [launched earlier](../test-network/overview).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger the following interoperation flows corresponding to distinct asset-sharing combinations _other combinations of DLTs will be supported soon_):
1. **Fabric with Fabric**: One Fabric network transfers either a bond or some tokens owned by Alice to Bob in the other network

Assuming that the `simpleassettransfer` chaincode has been deployed in both networks, run the following steps by navigating to the `samples/fabric/fabric-cli` folder (_the Go CLI doesn't support asset transfer yet_).

## Transfer or recover a bond (non-fungible) asset

1. Verify that `alice` owns bonds with ids `a03` and `a04` as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network1
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network1
   ```
   You should see a JSON structure corresponding to the bond being logged on the console in each case.
2. Get `alice` in `network1` to pledge bond `a03` to `bob` in `network2` as follows (with a 1 hour timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=bond --ref=a03 --data-file=src/data/assetsForTransfer.json
   ```
3. Get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./scripts/claimAsset.sh bond bond01 a03
   ```
4. Verify that `alice` in `network1` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network1
   ```
   You should see an error message like `Error: the asset a03 does not exist`.
5. Verify that `bob` in `network2` now owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a03","true"]' --local-network=network2
   ```
6. Now get `alice` in `network1` to pledge bond `a04` to `bob` in `network2` as follows (with a 1 minute timeout):
   ```bash
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=bond --ref=a04 --data-file=src/data/assetsForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
7. Now get `bob` in `network2` to claim this bond asset as follows:
   ```bash
   ./scripts/claimAsset.sh bond bond01 a04
   ```
   This should fail as the pledge has already expired.
8. Now get `alice` in `network1` to reclaim the asset as follows:
   ```bash
   ./scripts/reclaimAsset.sh bond bond01 a04
   ```
9. Verify that `alice` in `network1` owns this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network1
   ```
10. Verify that `bob` in `network2` does not own this asset as follows:
   ```bash
   ./bin/fabric-cli chaincode query mychannel simpleassettransfer ReadAsset '["bond01","a04","true"]' --local-network=network2
   ```
   You should see an error message like `Error: the asset a04 does not exist`.

## Transfer or recover token (fungible) assets

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
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=3600 --type=token --units=50 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
4. Get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./scripts/claimAsset.sh token token1 <pledge-id> 50
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
   ./bin/fabric-cli asset pledge --source-network=network1 --dest-network=network2 --recipient=bob --expiry-secs=60 --type=token --units=100 --owner=alice --data-file=src/data/tokensForTransfer.json
   ```
   Wait for a minute as follows:
   ```bash
   sleep 60
   ```
   You should see a message containing the unique ID of this pledge on the console as `Asset pledged with ID <pledge-id>` (`<pledge-id>` is a hexadecimal string).
8. Now get `bob` in `network2` to claim these tokens as follows (replace `<pledge-id>` with the above hexadecimal value):
   ```bash
   ./scripts/claimAsset.sh token token1 <pledge-id> 100
   ```
   This should fail as the pledge has already expired.
9. Now get `alice` in `network1` to reclaim these tokens as follows:
   ```bash
   ./scripts/reclaimAsset.sh token token1 <pledge-id>
   ```
10. Verify that `alice` in `network1` still owns `9950` tokens (after losing `50`) as follows:
   ```bash
   ./scripts/getTokenBalance.sh network1 alice
   ```
11. Verify that `bob` in `network2` still owns only `50` tokens as follows:
   ```bash
   ./scripts/getTokenBalance.sh network2 bob
   ```
